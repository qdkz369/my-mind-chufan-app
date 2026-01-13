"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MapPin, CreditCard, Settings, HelpCircle, FileText, Shield, ChevronRight, Star, User, Phone, Building2, Navigation, Loader2, CheckCircle2, AlertCircle, Locate, Package } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { loadAMapOnce, isAMapAvailable } from "@/lib/amap-loader"
import { getCachedAddress, cacheAddress } from "@/lib/geocoding-cache"

const menuItems = [
  { icon: Package, label: "我的设备", description: "查看已激活的设备", href: "/devices" },
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
  const [isLoginMode, setIsLoginMode] = useState(false) // 登录/注册模式切换
  const [isLoggingIn, setIsLoggingIn] = useState(false) // 登录中状态
  const [loginError, setLoginError] = useState("") // 登录错误信息
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
  
  // 初始化状态：正在读取 localStorage
  const [isInitializing, setIsInitializing] = useState(true)

  // 统计数据状态
  const [totalOrders, setTotalOrders] = useState<number>(0)
  const [totalSpent, setTotalSpent] = useState<number>(0)
  const [pointsBalance, setPointsBalance] = useState<number>(0)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // 从 localStorage 加载餐厅ID（自动登录）
  useEffect(() => {
    // 确保只在客户端执行
    if (typeof window === 'undefined') {
      setIsInitializing(false)
      setRestaurantInfo(null) // 服务端渲染时确保为 null
      return
    }
    
    const loadRestaurant = async () => {
      try {
        // 立即读取 localStorage，避免延迟
        const restaurantId = typeof window !== 'undefined' ? localStorage.getItem("restaurantId") : null
        console.log('[ProfileContent] 初始化检查，restaurantId:', restaurantId)
        console.log('[ProfileContent] Supabase配置状态:', {
          isSupabaseConfigured,
          hasSupabase: !!supabase,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '已配置' : '未配置'
        })
        
        // 如果没有 restaurantId，立即清除所有状态并显示注册表单
        if (!restaurantId || restaurantId.trim() === '') {
          console.log('[ProfileContent] 未找到restaurantId，清除所有状态并显示登录/注册表单')
          // 清除可能存在的无效缓存
          if (restaurantInfo) {
            console.log('[ProfileContent] 清除无效的restaurantInfo')
            setRestaurantInfo(null)
          }
          setIsLoginMode(false) // 默认显示注册表单
          setIsInitializing(false) // 立即完成初始化
          return
        }
        
        // 有 restaurantId，尝试加载
        console.log('[ProfileContent] 找到restaurantId，自动登录:', restaurantId)
        await loadRestaurantInfo(restaurantId)
        // 加载统计数据
        await loadRestaurantStats(restaurantId)
      } catch (error) {
        console.error('[ProfileContent] 加载餐厅信息失败:', error)
        // 发生错误时，清除所有状态
        setRestaurantInfo(null)
        setIsLoginMode(false)
        // 清除可能无效的 restaurantId
        if (typeof window !== 'undefined') {
          localStorage.removeItem("restaurantId")
        }
      } finally {
        // 标记初始化完成
        setIsInitializing(false)
      }
    }
    loadRestaurant()
  }, [])

  // 加载高德地图定位插件（使用全局单例加载器）
  useEffect(() => {
    const loadAMapPlugins = async () => {
      // 确保只在客户端执行
      if (typeof window === 'undefined') return
      
      // 如果已经加载，直接返回
      if (amapLoaded || isAMapAvailable()) {
        if (!amapLoaded) {
          setAmapLoaded(true)
        }
        // 初始化插件实例（如果还未初始化）
        if (!geolocationRef.current || !geocoderRef.current) {
          const AMap = (window as any).AMap
          if (AMap) {
            if (!geolocationRef.current) {
              geolocationRef.current = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0,
                convert: true,
                showButton: false,
                buttonOffset: new AMap.Pixel(10, 20),
                zoomToAccuracy: true,
                buttonPosition: 'RB',
                useNative: true,
                extensions: 'all',
                noIpLocate: false,
                noGeoLocation: false,
              })
            }
            if (!geocoderRef.current) {
              geocoderRef.current = new AMap.Geocoder({
                city: '全国',
              })
            }
          }
        }
        return
      }

      try {
        // 使用全局单例加载器，确保只加载一次
        const AMap = await loadAMapOnce()

        // 初始化定位插件
        geolocationRef.current = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
          convert: true,
          showButton: false,
          buttonOffset: new AMap.Pixel(10, 20),
          zoomToAccuracy: true,
          buttonPosition: 'RB',
          useNative: true,
          extensions: 'all',
          noIpLocate: false,
          noGeoLocation: false,
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
        console.log('[定位] 高德地图插件加载成功（全局单例）')
      } catch (error) {
        console.error('[定位] 加载高德地图插件失败:', error)
        setLocationError('地图服务加载失败，请刷新页面重试')
      }
    }

    loadAMapPlugins()
    // 修复：移除 amapLoaded 依赖，确保只执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 加载餐厅统计数据
  const loadRestaurantStats = async (restaurantId: string) => {
    if (!supabase || !isSupabaseConfigured || !restaurantId) {
      return
    }

    setIsLoadingStats(true)
    try {
      const response = await fetch(`/api/facts/restaurant/${restaurantId}/stats`, {
        headers: {
          "x-restaurant-id": restaurantId,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTotalOrders(data.total_orders || 0)
          setTotalSpent(data.total_spent || 0)
          setPointsBalance(data.points_balance || 0)
        }
      } else {
        console.warn('[ProfileContent] 加载统计数据失败:', response.status)
        // 失败时显示 0，不阻断流程
        setTotalOrders(0)
        setTotalSpent(0)
        setPointsBalance(0)
      }
    } catch (error) {
      console.error('[ProfileContent] 加载统计数据异常:', error)
      setTotalOrders(0)
      setTotalSpent(0)
      setPointsBalance(0)
    } finally {
      setIsLoadingStats(false)
    }
  }

  // 加载餐厅信息
  const loadRestaurantInfo = async (restaurantId: string) => {
    console.log('[加载餐厅信息] 开始加载，restaurantId:', restaurantId)
    
    // 验证 restaurantId 是否有效
    if (!restaurantId || restaurantId.trim() === '') {
      console.warn('[加载餐厅信息] restaurantId 无效，清除状态')
      setRestaurantInfo(null)
      if (typeof window !== 'undefined') {
        localStorage.removeItem("restaurantId")
      }
      return
    }
    
    // 首先尝试从 localStorage 缓存恢复（快速显示）
    const cachedData = typeof window !== 'undefined' ? localStorage.getItem(`restaurant_${restaurantId}`) : null
    if (cachedData) {
      try {
        const data = JSON.parse(cachedData)
        // 验证缓存数据的有效性：必须包含 id 且与 restaurantId 匹配
        if (data && data.id && data.id === restaurantId) {
          console.log('[加载餐厅信息] 从缓存恢复:', data)
          setRestaurantInfo(data)
          setFormData({
            name: data.contact_name || "",
            phone: data.contact_phone || "",
            restaurant_name: data.name || "",
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            address: data.address || "",
          })
        } else {
          console.warn('[加载餐厅信息] 缓存数据无效（ID不匹配），清除缓存')
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`restaurant_${restaurantId}`)
          }
        }
      } catch (e) {
        console.error('[加载餐厅信息] 解析缓存数据失败:', e)
        // 清除无效缓存
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`restaurant_${restaurantId}`)
        }
      }
    }
    
    // 检查 Supabase 是否已配置
    if (!supabase || !isSupabaseConfigured) {
      console.warn('[加载餐厅信息] Supabase未配置，仅使用localStorage缓存数据')
      // 如果没有有效的缓存数据，清除状态
      if (!cachedData || !restaurantInfo) {
        setRestaurantInfo(null)
        // 清除无效的 restaurantId
        if (typeof window !== 'undefined') {
          localStorage.removeItem("restaurantId")
        }
      }
      return
    }

    try {
      console.log('[加载餐厅信息] 从Supabase加载数据...')
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, contact_name, contact_phone, address, latitude, longitude, status")
        .eq("id", restaurantId)
        .maybeSingle()

      if (!error && data) {
        console.log('[加载餐厅信息] Supabase加载成功:', data)
        setRestaurantInfo(data)
        // 更新缓存到localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(`restaurant_${restaurantId}`, JSON.stringify(data))
        }
        setFormData({
          name: data.contact_name || "",
          phone: data.contact_phone || "",
          restaurant_name: data.name || "",
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          address: data.address || "",
        })
      } else if (error) {
        console.error("[加载餐厅信息] Supabase查询失败:", error)
        // 如果 Supabase 查询失败，但已有缓存数据，保持使用缓存
        if (!cachedData) {
          setRestaurantInfo(null)
        }
      } else {
        // 数据不存在
        console.warn("[加载餐厅信息] 餐厅数据不存在，restaurantId:", restaurantId)
        // 清除无效的缓存
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`restaurant_${restaurantId}`)
          localStorage.removeItem("restaurantId")
        }
        setRestaurantInfo(null)
      }
    } catch (error) {
      console.error("[加载餐厅信息] 异常:", error)
      // 如果发生异常，但已有缓存数据，保持使用缓存
      if (!cachedData) {
        setRestaurantInfo(null)
      }
    }
  }

  // 高德地图精确定位 - 优化版本，提高定位精度
  const handleAMapLocation = async () => {
    // 首先尝试浏览器原生定位（更精确）
    if (navigator.geolocation) {
      try {
        setIsLocating(true)
        setLocationError("")
        
        // 使用浏览器原生定位获取高精度坐标
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true, // 启用高精度
              timeout: 20000, // 20秒超时
              maximumAge: 0, // 不使用缓存
            }
          )
        })

        const { latitude, longitude, accuracy } = position.coords
        
        // 验证定位精度：如果精度大于50米，提示用户
        if (accuracy > 50) {
          console.warn(`[定位] 定位精度较低: ${accuracy.toFixed(0)}米`)
        } else {
          console.log(`[定位] 定位精度良好: ${accuracy.toFixed(0)}米`)
        }

        // 首先检查缓存
        const cachedAddr = getCachedAddress(latitude, longitude)
        if (cachedAddr) {
          console.log('[定位] 使用缓存地址:', cachedAddr)
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            address: cachedAddr,
          }))
          setLocationError("")
          setIsLocating(false)
          return
        }

        // 如果高德地图已加载，使用高德逆地理编码获取地址
        if (amapLoaded && geocoderRef.current) {
          try {
            const AMap = (window as any).AMap
            const lngLat = new AMap.LngLat(longitude, latitude)
            
            // 使用高德逆地理编码获取详细地址
            geocoderRef.current.getAddress(lngLat, (geocodeStatus: string, geocodeResult: any) => {
              if (geocodeStatus === 'complete' && geocodeResult && geocodeResult.info === 'OK' && geocodeResult.regeocode) {
                // 优先使用格式化地址
                let address = geocodeResult.regeocode.formattedAddress
                
                // 如果格式化地址为空，尝试从地址组件构建更详细的地址
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
                
                // 如果还是没有地址，使用坐标
                if (!address || address.trim() === '') {
                  address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                }

                // 缓存地址
                cacheAddress(latitude, longitude, address)

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
                // 逆地理编码失败，但坐标已获取，保存坐标
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
            // 即使逆地理编码失败，也保存坐标
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
          // 高德地图未加载，直接保存坐标
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
        
        // 浏览器定位失败，降级使用高德定位
        if (amapLoaded && geolocationRef.current) {
          // 继续使用高德定位，不设置错误信息，让高德定位尝试
          console.log('[定位] 浏览器定位失败，降级使用高德地图定位...')
        } else {
          setLocationError(errorMessage)
          setIsLocating(false)
          return
        }
      }
    }

    // 降级方案：使用高德地图定位
    if (!amapLoaded || !geolocationRef.current || !geocoderRef.current) {
      setLocationError("地图服务未加载完成，请稍候再试")
      console.warn('[定位] 地图服务未就绪:', { amapLoaded, geolocation: !!geolocationRef.current, geocoder: !!geocoderRef.current })
      setIsLocating(false)
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
    }, 25000) // 25秒超时

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
          
          // 验证坐标有效性
          if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
            console.error('[定位] 坐标无效:', { latitude, longitude })
            setLocationError("获取的坐标无效，请重试")
            setIsLocating(false)
            if (geolocationRef.current) {
              geolocationRef.current.off('complete', handleComplete)
              geolocationRef.current.off('error', handleError)
            }
            return
          }

          // 检查定位精度（如果可用）
          const accuracy = data.accuracy || data.position.accuracy
          if (accuracy && accuracy > 100) {
            console.warn(`[定位] 定位精度较低: ${accuracy.toFixed(0)}米`)
          } else if (accuracy) {
            console.log(`[定位] 定位精度: ${accuracy.toFixed(0)}米`)
          }

          console.log('[定位] 获取到坐标:', { latitude, longitude, accuracy })

          // 首先检查缓存
          const cachedAddr = getCachedAddress(latitude, longitude)
          if (cachedAddr) {
            console.log('[定位] 使用缓存地址:', cachedAddr)
            setFormData(prev => ({
              ...prev,
              latitude,
              longitude,
              address: cachedAddr,
            }))
            setLocationError("")
            setIsLocating(false)
            if (geolocationRef.current) {
              geolocationRef.current.off('complete', handleComplete)
              geolocationRef.current.off('error', handleError)
            }
            return
          }

          // 使用逆地理编码将坐标转换为地址
          // 高德地图的 getAddress 方法需要传入 LngLat 对象
          try {
            // 确保 AMap 对象可用
            if (typeof window !== 'undefined' && (window as any).AMap) {
              const AMap = (window as any).AMap
              const lngLat = new AMap.LngLat(longitude, latitude)
              
              geocoderRef.current.getAddress(lngLat, (geocodeStatus: string, geocodeResult: any) => {
                console.log('[定位] 逆地理编码回调:', { geocodeStatus, geocodeResult })
                
                if (geocodeStatus === 'complete' && geocodeResult && geocodeResult.info === 'OK' && geocodeResult.regeocode) {
                  // 优先使用格式化地址
                  let address = geocodeResult.regeocode.formattedAddress
                  
                  // 如果格式化地址为空，尝试从地址组件构建
                  if (!address && geocodeResult.regeocode.addressComponent) {
                    const addrComp = geocodeResult.regeocode.addressComponent
                    const parts = [
                      addrComp.province,
                      addrComp.city,
                      addrComp.district,
                      addrComp.township,
                      addrComp.street,
                      addrComp.streetNumber
                    ].filter(Boolean)
                    address = parts.join('')
                  }
                  
                  // 如果还是没有地址，使用坐标
                  if (!address || address.trim() === '') {
                    address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                  }

                  // 缓存地址
                  cacheAddress(latitude, longitude, address)

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
                  // 如果逆地理编码失败，尝试使用坐标作为地址
                  console.warn('[定位] 地址解析失败，状态:', geocodeStatus, '结果:', geocodeResult)
                  
                  // 尝试从错误结果中提取信息
                  let errorInfo = ''
                  if (geocodeResult && geocodeResult.info) {
                    errorInfo = ` (${geocodeResult.info})`
                  }
                  
                  setFormData(prev => ({
                    ...prev,
                    latitude,
                    longitude,
                    address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                  }))
                  setLocationError(`地址解析失败${errorInfo}，已保存坐标`)
                  setIsLocating(false)
                  
                  // 移除事件监听
                  if (geolocationRef.current) {
                    geolocationRef.current.off('complete', handleComplete)
                    geolocationRef.current.off('error', handleError)
                  }
                }
              })
            } else {
              // AMap 对象不可用，直接保存坐标
              console.warn('[定位] AMap 对象不可用，直接保存坐标')
              setFormData(prev => ({
                ...prev,
                latitude,
                longitude,
                address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              }))
              setLocationError("地图服务不可用，已保存坐标")
              setIsLocating(false)
              
              if (geolocationRef.current) {
                geolocationRef.current.off('complete', handleComplete)
                geolocationRef.current.off('error', handleError)
              }
            }
          } catch (error) {
            // 捕获逆地理编码过程中的异常
            console.error('[定位] 逆地理编码异常:', error)
            setFormData(prev => ({
              ...prev,
              latitude,
              longitude,
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            }))
            setLocationError("地址解析异常，已保存坐标")
            setIsLocating(false)
            
            if (geolocationRef.current) {
              geolocationRef.current.off('complete', handleComplete)
              geolocationRef.current.off('error', handleError)
            }
          }
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
        
        // 将英文错误信息翻译成中文
        let errorMessage = data?.message || data?.info || data?.message || ""
        const errorCode = data?.code || ""
        
        // 常见错误信息翻译
        if (errorMessage.includes("Get geolocation timeout") || errorMessage.includes("timeout")) {
          errorMessage = "定位超时，请检查网络连接或定位权限"
        } else if (errorMessage.includes("Get ipLocation failed") || errorMessage.includes("ipLocation")) {
          errorMessage = "IP定位失败，请允许浏览器访问您的位置信息"
        } else if (errorMessage.includes("permission denied") || errorMessage.includes("权限")) {
          errorMessage = "定位权限被拒绝，请在浏览器设置中允许位置访问"
        } else if (errorMessage.includes("not available") || errorMessage.includes("不可用")) {
          errorMessage = "定位服务不可用，请检查设备定位功能是否开启"
        } else if (errorMessage.includes("network") || errorMessage.includes("网络")) {
          errorMessage = "网络错误，请检查网络连接后重试"
        } else if (!errorMessage || errorMessage.trim() === "") {
          errorMessage = "定位失败，请检查定位权限或稍后重试"
        } else if (errorMessage.includes("Get geolocation") || errorMessage.includes("Get ipLocation")) {
          // 处理高德地图的英文错误信息
          errorMessage = "定位服务异常，请检查定位权限或网络连接"
        }
        
        // 如果错误信息仍然是英文，使用通用提示
        if (errorMessage && /^[A-Za-z\s]+$/.test(errorMessage.replace(/[^A-Za-z\s]/g, ''))) {
          errorMessage = "定位失败，请检查定位权限或网络连接"
        }
        
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
      const restaurantId = typeof window !== 'undefined' ? localStorage.getItem("restaurantId") : null

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
          
          // 如果返回404，说明记录不存在，清除localStorage并切换到注册模式
          if (response.status === 404) {
            console.log('[注册表单] 记录不存在，清除localStorage并切换到注册模式')
            if (typeof window !== 'undefined') {
              localStorage.removeItem("restaurantId")
              localStorage.removeItem(`restaurant_${restaurantId}`)
            }
            
            // 自动重试注册
            const registerResponse = await fetch("/api/restaurant/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: formData.name,
                phone: formData.phone,
                restaurant_name: formData.restaurant_name,
                latitude: hasLocation ? Number(formData.latitude) : null,
                longitude: hasLocation ? Number(formData.longitude) : null,
                address: formData.address || undefined,
              }),
            })
            
            if (!registerResponse.ok) {
              const registerError = await registerResponse.json().catch(() => ({ error: "网络请求失败" }))
              alert(`注册失败 (${registerResponse.status}): ${registerError.error || "网络请求失败"}`)
              return
            }
            
            const registerResult = await registerResponse.json()
            
            if (!registerResult.error && registerResult.data) {
              const newRestaurantId = registerResult.data.restaurant_id
              if (typeof window !== 'undefined') {
                localStorage.setItem("restaurantId", newRestaurantId)
              }
              
              const newRestaurantInfo = {
                id: newRestaurantId,
                name: registerResult.data.name || formData.restaurant_name,
                contact_name: formData.name,
                contact_phone: formData.phone,
                address: formData.address || null,
                latitude: hasLocation ? formData.latitude : null,
                longitude: hasLocation ? formData.longitude : null,
                status: registerResult.data.status || "unactivated",
              }
              
              setRestaurantInfo(newRestaurantInfo)
              if (typeof window !== 'undefined') {
                localStorage.setItem(`restaurant_${newRestaurantId}`, JSON.stringify(newRestaurantInfo))
              }
              
              setSubmitSuccess(true)
              setIsEditing(false)
              router.refresh()
              setTimeout(() => setSubmitSuccess(false), 3000)
              return
            } else {
              alert(`注册失败: ${registerResult.error || "未知错误"}`)
              return
            }
          } else {
            alert(`更新失败 (${response.status}): ${errorResult.error || "网络请求失败"}`)
            return
          }
        }

        const result = await response.json()
        
        console.log('[注册表单] 更新API响应:', result)

        // 松绑逻辑判断：只要没有 error 就执行成功逻辑
        if (!result.error) {
          setSubmitSuccess(true)
          setIsEditing(false)
          if (result.data) {
            setRestaurantInfo(result.data)
            // 更新缓存
            const updatedRestaurantId = result.data.id || restaurantId
            if (updatedRestaurantId && typeof window !== 'undefined') {
              localStorage.setItem(`restaurant_${updatedRestaurantId}`, JSON.stringify(result.data))
            }
            // 刷新统计数据
            await loadRestaurantStats(updatedRestaurantId)
          } else {
            // 如果没有返回数据，重新加载
            if (restaurantId) {
              await loadRestaurantInfo(restaurantId)
              await loadRestaurantStats(restaurantId)
            }
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
            const restaurantId = result.data.restaurant_id
            if (typeof window !== 'undefined') {
              localStorage.setItem("restaurantId", restaurantId)
            }
            
            // 构建完整的餐厅信息对象
            const newRestaurantInfo = {
              id: restaurantId,
              name: result.data.name || formData.restaurant_name,
              contact_name: formData.name,
              contact_phone: formData.phone,
              address: formData.address || null,
              latitude: hasLocation ? formData.latitude : null,
              longitude: hasLocation ? formData.longitude : null,
              status: result.data.status || "unactivated",
            }
            
            // 立即设置状态，确保UI更新
            setRestaurantInfo(newRestaurantInfo)
            
            // 缓存到localStorage，以便页面刷新后能快速恢复
            if (typeof window !== 'undefined') {
              localStorage.setItem(`restaurant_${restaurantId}`, JSON.stringify(newRestaurantInfo))
            }
            
            console.log('[注册表单] 注册成功，已保存餐厅信息:', newRestaurantInfo)
            // 加载统计数据
            await loadRestaurantStats(restaurantId)
          } else {
            // 即使没有返回完整数据，也尝试保存基本信息
            console.warn('[注册表单] API返回数据不完整，但操作可能已成功')
            // 尝试从localStorage获取之前保存的ID
            const existingId = typeof window !== 'undefined' ? localStorage.getItem("restaurantId") : null
            if (existingId) {
              // 重新加载数据
              await loadRestaurantInfo(existingId)
              await loadRestaurantStats(existingId)
            }
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

  // 登录处理
  const handleLogin = async () => {
    if (!formData.phone.trim()) {
      setLoginError("请输入手机号")
      return
    }

    setIsLoggingIn(true)
    setLoginError("")

    try {
      const response = await fetch("/api/restaurant/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: formData.phone.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || "登录失败")
      }

      if (result.success && result.data) {
        const restaurantId = result.data.restaurant_id
        if (typeof window !== 'undefined') {
          localStorage.setItem("restaurantId", restaurantId)
        }
        
        // 构建完整的餐厅信息对象
        const loginRestaurantInfo = {
          id: restaurantId,
          name: result.data.name || "",
          contact_name: result.data.contact_name || "",
          contact_phone: result.data.contact_phone || "",
          address: result.data.address || null,
          latitude: result.data.latitude || null,
          longitude: result.data.longitude || null,
          status: result.data.status || "unactivated",
        }
        
            setRestaurantInfo(loginRestaurantInfo)
            setFormData({
              name: loginRestaurantInfo.contact_name || "",
              phone: loginRestaurantInfo.contact_phone || "",
              restaurant_name: loginRestaurantInfo.name || "",
              latitude: loginRestaurantInfo.latitude || 0,
              longitude: loginRestaurantInfo.longitude || 0,
              address: loginRestaurantInfo.address || "",
            })
            
            // 缓存到localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem(`restaurant_${restaurantId}`, JSON.stringify(loginRestaurantInfo))
            }
            
            // 加载统计数据
            await loadRestaurantStats(restaurantId)
            
            setIsLoginMode(false)
            setSubmitSuccess(true)
            setTimeout(() => setSubmitSuccess(false), 3000)
            router.refresh()
      }
    } catch (error: any) {
      console.error("登录失败:", error)
      setLoginError(error.message || "登录失败，请检查手机号是否正确")
    } finally {
      setIsLoggingIn(false)
    }
  }

  // 退出登录
  const handleLogout = () => {
    if (typeof window !== 'undefined' && confirm("确定要退出登录吗？")) {
      const restaurantId = typeof window !== 'undefined' ? localStorage.getItem("restaurantId") : null
      if (restaurantId && typeof window !== 'undefined') {
        localStorage.removeItem("restaurantId")
        localStorage.removeItem(`restaurant_${restaurantId}`)
      }
      setRestaurantInfo(null)
      setFormData({
        name: "",
        phone: "",
        restaurant_name: "",
        latitude: 0,
        longitude: 0,
        address: "",
      })
      setIsLoginMode(false)
      setIsEditing(false)
      router.refresh()
    }
  }

  const isRegistered = restaurantInfo !== null
  const isUnactivated = restaurantInfo?.status === "unactivated"

  // 如果正在初始化，显示加载状态
  if (isInitializing) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  // 如果未注册且不在编辑模式，只显示注册/登录表单
  if (!isRegistered && !isEditing) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Card className="theme-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">
                {isLoginMode ? "登录" : "注册信息"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isLoginMode ? "使用手机号登录" : "填写信息以激活服务"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsLoginMode(!isLoginMode)
                setLoginError("")
                setFormData(prev => ({ ...prev, name: "", restaurant_name: "", address: "", latitude: 0, longitude: 0 }))
              }}
              className="text-blue-400 hover:text-blue-300"
            >
              {isLoginMode ? "去注册" : "已有账号？登录"}
            </Button>
          </div>

          {submitSuccess && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400">
                {isLoginMode ? "登录成功！" : "注册成功！"}
              </span>
            </div>
          )}

          {loginError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400">{loginError}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* 手机号（登录和注册都需要） */}
            <div>
              <Label htmlFor="phone" className="text-foreground mb-2 block">
                手机号 <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, phone: e.target.value }))
                    setLoginError("")
                  }}
                  className="pl-10 theme-input text-foreground placeholder:text-muted-foreground"
                  placeholder="请输入手机号"
                />
              </div>
            </div>

            {/* 登录模式：只显示手机号 */}
            {isLoginMode && (
              <>
                <Button
                  onClick={handleLogin}
                  disabled={isLoggingIn || !formData.phone.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-lg font-semibold theme-button"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      登录
                    </>
                  )}
                </Button>
              </>
            )}

            {/* 注册模式：显示完整表单 */}
            {!isLoginMode && (
              <>
                {/* 姓名 */}
                <div>
                  <Label htmlFor="name" className="text-foreground mb-2 block">
                    姓名 <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-10 theme-input text-foreground placeholder:text-muted-foreground"
                      placeholder="请输入您的姓名"
                    />
                  </div>
                </div>

                {/* 餐厅名称 */}
                <div>
                  <Label htmlFor="restaurant_name" className="text-foreground mb-2 block">
                    餐厅名称 <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="restaurant_name"
                      value={formData.restaurant_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, restaurant_name: e.target.value }))}
                      className="pl-10 theme-input text-foreground placeholder:text-muted-foreground"
                      placeholder="请输入餐厅名称"
                    />
                  </div>
                </div>

                {/* 详细地址（仅注册模式显示） */}
                <div>
                  <Label htmlFor="address" className="text-foreground mb-2 block">
                    详细地址 <span className="text-muted-foreground text-xs">(可选)</span>
                  </Label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        className="pl-10 theme-input text-foreground placeholder:text-muted-foreground"
                        placeholder="请输入详细地址或点击右侧按钮自动获取"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleAMapLocation}
                      disabled={isLocating || !amapLoaded}
                      className="px-4 bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0 theme-button"
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
                      <p className="text-xs text-muted-foreground mt-1">
                        提示：地理位置为可选信息，您可以跳过此步骤继续完成注册
                      </p>
                    </div>
                  )}
                  {formData.address && formData.latitude !== 0 && formData.longitude !== 0 && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-lg theme-card">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{formData.address}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            坐标: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {!amapLoaded && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      正在加载定位服务...
                    </p>
                  )}
                </div>

                {/* 提交按钮（仅注册模式显示） */}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.name.trim() || !formData.phone.trim() || !formData.restaurant_name.trim()}
                  className="w-full bg-success hover:bg-success/90 text-success-foreground h-12 text-lg font-semibold theme-button"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      注册中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      完成注册
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* 登录/注册/编辑表单 */}
      {isEditing ? (
        <Card className="theme-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground">编辑资料</h2>
              <p className="text-xs text-muted-foreground">更新您的餐厅信息</p>
            </div>
            <Button
              onClick={() => setIsEditing(false)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              取消
            </Button>
          </div>

          {submitSuccess && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400">信息更新成功！</span>
            </div>
          )}

          {loginError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400">{loginError}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* 手机号（登录和注册都需要） */}
            <div>
              <Label htmlFor="phone" className="text-foreground mb-2 block">
                手机号 <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, phone: e.target.value }))
                    setLoginError("")
                  }}
                  className="pl-10 theme-input text-foreground placeholder:text-muted-foreground"
                  placeholder="请输入手机号"
                />
              </div>
            </div>

            {/* 编辑模式：显示完整表单 */}
            <>
              {/* 姓名 */}
              <div>
                <Label htmlFor="name" className="text-foreground mb-2 block">
                  姓名 <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="pl-10 theme-input text-foreground placeholder:text-muted-foreground"
                    placeholder="请输入您的姓名"
                  />
                </div>
              </div>

              {/* 餐厅名称 */}
              <div>
                <Label htmlFor="restaurant_name" className="text-foreground mb-2 block">
                  餐厅名称 <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="restaurant_name"
                    value={formData.restaurant_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, restaurant_name: e.target.value }))}
                    className="pl-10 theme-input text-foreground placeholder:text-muted-foreground"
                    placeholder="请输入餐厅名称"
                  />
                </div>
              </div>

              {/* 详细地址 */}
              <div>
                <Label htmlFor="address" className="text-foreground mb-2 block">
                  详细地址 <span className="text-muted-foreground text-xs">(可选)</span>
                </Label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="pl-10 theme-input text-foreground placeholder:text-muted-foreground"
                    placeholder="请输入详细地址或点击右侧按钮自动获取"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAMapLocation}
                  disabled={isLocating || !amapLoaded}
                  className="px-4 bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0 theme-button"
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
                  <p className="text-xs text-muted-foreground mt-1">
                    提示：地理位置为可选信息，您可以跳过此步骤继续完成注册
                  </p>
                </div>
              )}
              {formData.address && formData.latitude !== 0 && formData.longitude !== 0 && (
                <div className="mt-2 p-3 bg-secondary800/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{formData.address}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        坐标: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
                {!amapLoaded && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    正在加载定位服务...
                  </p>
                )}
              </div>
            </>

            {/* 提交按钮 */}
            <>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.name.trim() || !formData.phone.trim() || !formData.restaurant_name.trim()}
                className="w-full bg-success hover:bg-success/90 text-success-foreground h-12 text-lg font-semibold theme-button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    更新中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    保存修改
                  </>
                )}
              </Button>

              <Button
                onClick={() => setIsEditing(false)}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                取消
              </Button>
            </>
          </div>
        </Card>
      ) : isRegistered ? (
        /* 已注册信息展示 */
        <>
          <Card className="theme-card p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src="/placeholder.svg?height=64&width=64" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  {restaurantInfo.contact_name?.[0] || "用"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-foreground">{restaurantInfo.contact_name || "未设置"}</h2>
                  {isUnactivated ? (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      待激活
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-linear-to-r from-warning to-orange-600 text-warning-foreground border-0">
                      已激活
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{restaurantInfo.name}</p>
                <p className="text-sm text-muted-foreground">手机: {restaurantInfo.contact_phone || "未设置"}</p>
                {restaurantInfo.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {restaurantInfo.address}
                  </p>
                )}
              </div>
              <Button
                onClick={() => setIsEditing(true)}
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80"
              >
                编辑
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center theme-card">
              <div className="text-2xl font-bold mb-1 text-foreground data-value">
                {isLoadingStats ? "..." : totalOrders.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground data-unit">累计订单</div>
            </Card>
            <Card className="p-4 text-center theme-card">
              <div className="text-2xl font-bold mb-1 text-foreground data-value">
                {isLoadingStats ? "..." : totalSpent >= 1000 
                  ? `¥${(totalSpent / 1000).toFixed(1)}k` 
                  : `¥${totalSpent.toLocaleString()}`}
              </div>
              <div className="text-xs text-muted-foreground data-unit">累计消费</div>
            </Card>
            <Card className="p-4 text-center theme-card">
              <div className="text-2xl font-bold mb-1 text-foreground data-value">
                {isLoadingStats ? "..." : pointsBalance.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground data-unit">积分余额</div>
            </Card>
          </div>

          {/* 主题切换器 */}
          <Card className="theme-card p-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-1">主题切换</h3>
                <p className="text-sm text-muted-foreground">选择您喜欢的界面风格</p>
              </div>
              <ThemeSwitcher />
            </div>
          </Card>

          <Card className="theme-card divide-y divide-border/50">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="theme-button w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-all text-left"
                style={{ borderRadius: 0 }}
              >
                <div className="w-10 h-10 bg-secondary/50 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-button)' }}>
                  <item.icon className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium mb-0.5 text-foreground">{item.label}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </Card>

          <Card className="p-4 theme-card">
            <button 
              onClick={handleLogout}
              className="w-full text-destructive font-medium hover:text-destructive/80 transition-colors"
            >
              退出登录
            </button>
          </Card>
        </>
      ) : null}
    </div>
  )
}
