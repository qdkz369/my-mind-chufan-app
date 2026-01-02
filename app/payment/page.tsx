"use client"

import { useState, Suspense, useMemo, useEffect, useRef } from "react"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Truck, ArrowLeft, CheckCircle2, CreditCard, Smartphone, Wallet, MapPin, Calculator, Navigation, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

// 液化气和醇基燃料的固定规格
const bottleSpecs = [5, 15, 50] // KG

// 热能清洁燃料的规格（起订200L，最小增加单位为50L）
const getCleanFuelOptions = () => {
  const options = []
  for (let i = 200; i <= 2000; i += 50) {
    options.push(i)
  }
  return options
}

const fuelTypes = [
  {
    id: "lpg",
    name: "液化气",
    unit: "kg",
    basePrice: 11.5, // 11.5元/kg
    unitLabel: "公斤",
    quantityType: "bottle", // 固定规格选择
  },
  {
    id: "clean",
    name: "热能清洁燃料",
    unit: "L",
    basePrice: 7.5, // 750元/100L = 7.5元/L
    unitLabel: "升",
    quantityType: "incremental", // 起订200L，50L递增
  },
  {
    id: "alcohol",
    name: "醇基燃料",
    unit: "kg",
    basePrice: 3.5, // 175元/50KG = 3.5元/kg
    unitLabel: "公斤",
    quantityType: "bottle", // 固定规格选择
  },
  {
    id: "outdoor",
    name: "户外环保燃料",
    unit: "kg",
    basePrice: 6, // 6元/kg
    unitLabel: "公斤",
    quantityType: "free", // 自由输入
  },
]

const paymentMethods = [
  {
    id: "wechat",
    name: "微信支付",
    icon: Smartphone,
    color: "from-green-500 to-emerald-600",
    shadowColor: "shadow-green-500/30",
    description: "使用微信扫码支付",
  },
  {
    id: "alipay",
    name: "支付宝",
    icon: Wallet,
    color: "from-blue-500 to-cyan-600",
    shadowColor: "shadow-blue-500/30",
    description: "使用支付宝扫码支付",
  },
  {
    id: "bank",
    name: "银行卡支付",
    icon: CreditCard,
    color: "from-purple-500 to-indigo-600",
    shadowColor: "shadow-purple-500/30",
    description: "支持各大银行借记卡/信用卡",
  },
]

// 主要城市到昆明的距离（公里）
const cityDistances: Record<string, number> = {
  昆明市: 0,
  大理市: 330,
  丽江市: 500,
  曲靖市: 150,
  玉溪市: 90,
  保山市: 500,
  昭通市: 400,
  临沧市: 400,
  普洱市: 420,
  楚雄市: 150,
  红河州: 250,
  文山州: 400,
  西双版纳: 550,
  德宏州: 600,
  怒江州: 600,
  迪庆州: 600,
  北京市: 2200,
  上海市: 2200,
  广州市: 1400,
  深圳市: 1400,
  成都市: 900,
  重庆市: 800,
  贵阳市: 500,
  南宁市: 900,
  长沙市: 1200,
  武汉市: 1500,
  杭州市: 2000,
  南京市: 2000,
  西安市: 1500,
  郑州市: 1700,
  石家庄市: 2100,
  济南市: 2100,
  沈阳市: 2800,
  长春市: 3000,
  哈尔滨市: 3300,
  乌鲁木齐市: 3000,
  拉萨市: 2000,
  银川市: 1800,
  西宁市: 1500,
  兰州市: 1600,
  呼和浩特市: 2400,
  太原市: 2000,
  天津市: 2200,
  大连市: 2800,
  青岛市: 2200,
  厦门市: 1800,
  福州市: 1900,
  南昌市: 1400,
  合肥市: 1900,
  苏州市: 2000,
  无锡市: 2000,
  宁波市: 2000,
  温州市: 1900,
  佛山市: 1400,
  东莞市: 1400,
  中山市: 1400,
  珠海市: 1400,
  惠州市: 1400,
  江门市: 1400,
  肇庆市: 1400,
  汕头市: 1600,
  湛江市: 1200,
  茂名市: 1300,
  梅州市: 1500,
  河源市: 1400,
  清远市: 1300,
  韶关市: 1200,
  阳江市: 1300,
  揭阳市: 1600,
  汕尾市: 1500,
  潮州市: 1600,
  云浮市: 1300,
}

// 计算两点之间的距离（使用Haversine公式）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 地球半径（公里）
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

// 注意：距离计算已改为基于配送员实际位置，不再使用固定坐标

function PaymentContent() {
  const searchParams = useSearchParams()
  const serviceType = searchParams.get("service") || "燃料配送"
  const [selectedPayment, setSelectedPayment] = useState<string>("wechat")
  const [selectedFuel, setSelectedFuel] = useState<string>("lpg")
  const [fuelQuantity, setFuelQuantity] = useState<number>(50) // 液化气默认50KG
  const [selectedSpec, setSelectedSpec] = useState<number>(50) // 规格（公斤），默认50KG
  const [bottleCount, setBottleCount] = useState<number>(1) // 瓶数，默认1瓶
  const [cleanFuelIndex, setCleanFuelIndex] = useState<number>(0) // 热能清洁燃料当前显示的索引
  const [isSliderPulsing, setIsSliderPulsing] = useState<boolean>(false) // 滑块呼吸灯闪烁状态
  const [deliveryCity, setDeliveryCity] = useState<string>("昆明市")
  const [deliveryAddress, setDeliveryAddress] = useState<string>("张记餐厅 · 昆明市五华区xxx路123号")
  
  // GPS定位相关状态
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number
    lon: number
    address: string
    city: string
  } | null>(null)
  const [isLocating, setIsLocating] = useState<boolean>(false)
  const [locationError, setLocationError] = useState<string>("")
  const [useGPS, setUseGPS] = useState<boolean>(false)
  const [isLoadedFromMemory, setIsLoadedFromMemory] = useState<boolean>(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false)
  
  // 配送员和商户位置相关状态
  const [deliveryLocation, setDeliveryLocation] = useState<{
    lat: number
    lon: number
    deliveryId: string
    updatedAt?: string
  } | null>(null)
  const [merchantLocation, setMerchantLocation] = useState<{
    lat: number
    lon: number
    address?: string
    city?: string
    merchantId: string
  } | null>(null)
  const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(false)

  // 从localStorage加载上一次的订单信息
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      if (typeof window === "undefined") return
      const savedOrder = localStorage.getItem("lastSuccessfulOrder")
      if (savedOrder) {
        const orderData = JSON.parse(savedOrder)
        
        // 恢复订单信息
        if (orderData.selectedFuel) {
          setSelectedFuel(orderData.selectedFuel)
        }
        if (orderData.fuelQuantity) {
          setFuelQuantity(orderData.fuelQuantity)
        }
        if (orderData.selectedSpec) {
          setSelectedSpec(orderData.selectedSpec)
        }
        if (orderData.bottleCount) {
          setBottleCount(orderData.bottleCount)
        }
        if (orderData.cleanFuelIndex !== undefined) {
          setCleanFuelIndex(orderData.cleanFuelIndex)
        }
        if (orderData.deliveryCity) {
          setDeliveryCity(orderData.deliveryCity)
        }
        if (orderData.deliveryAddress) {
          setDeliveryAddress(orderData.deliveryAddress)
        }
        if (orderData.selectedPayment) {
          setSelectedPayment(orderData.selectedPayment)
        }
        
        // 恢复GPS信息
        if (orderData.gpsLocation) {
          setGpsLocation(orderData.gpsLocation)
          setUseGPS(orderData.useGPS || false)
        }
        
        setIsLoadedFromMemory(true)
      }
    } catch (error) {
      console.error("加载上次订单信息失败:", error)
    }
  }, [])

  // 同步热能清洁燃料的数量
  useEffect(() => {
    const currentFuel = fuelTypes.find((f) => f.id === selectedFuel)
    if (currentFuel?.quantityType === "incremental") {
      const options = getCleanFuelOptions()
      // 确保索引在有效范围内
      const validIndex = Math.max(0, Math.min(cleanFuelIndex, options.length - 1))
      if (validIndex !== cleanFuelIndex) {
        setCleanFuelIndex(validIndex)
        return
      }
      const currentOption = options[validIndex] || options[0]
      setFuelQuantity(currentOption)
    }
  }, [cleanFuelIndex, selectedFuel])

  // 获取配送员和商户位置
  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoadingLocations(true)
      try {
        // 获取配送员实时位置
        const deliveryResponse = await fetch("/api/delivery/location?deliveryId=default")
        if (deliveryResponse.ok) {
          const deliveryData = await deliveryResponse.json()
          setDeliveryLocation({
            lat: deliveryData.lat,
            lon: deliveryData.lon,
            deliveryId: deliveryData.deliveryId,
            updatedAt: deliveryData.updatedAt,
          })
        }

        // 获取商户注册位置（从localStorage或API）
        if (typeof window === "undefined") return
        const merchantId = localStorage.getItem("merchantId") || "default"
        const merchantResponse = await fetch(`/api/merchant/location?merchantId=${merchantId}`)
        if (merchantResponse.ok) {
          const merchantData = await merchantResponse.json()
          if (merchantData.lat && merchantData.lon) {
            setMerchantLocation({
              lat: merchantData.lat,
              lon: merchantData.lon,
              address: merchantData.address,
              city: merchantData.city,
              merchantId: merchantData.merchantId,
            })
          }
        }
      } catch (error) {
        console.error("获取位置信息失败:", error)
      } finally {
        setIsLoadingLocations(false)
      }
    }

    fetchLocations()
    
    // 定期更新配送员位置（每30秒）
    const interval = setInterval(() => {
      fetch("/api/delivery/location?deliveryId=default")
        .then((res) => res.json())
        .then((data) => {
          if (data.lat && data.lon) {
            setDeliveryLocation({
              lat: data.lat,
              lon: data.lon,
              deliveryId: data.deliveryId,
              updatedAt: data.updatedAt,
            })
          }
        })
        .catch((error) => console.error("更新配送员位置失败:", error))
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // 计算距离：根据服务端配送员的实际位置到下单客户的实际距离
  const distance = useMemo(() => {
    // 1. 如果配送员位置和商户位置都存在，计算两者之间的距离
    if (deliveryLocation && merchantLocation) {
      return calculateDistance(
        deliveryLocation.lat,
        deliveryLocation.lon,
        merchantLocation.lat,
        merchantLocation.lon
      )
    }
    
    // 2. 如果使用GPS定位，计算GPS位置与配送员位置的距离
    if (useGPS && gpsLocation && deliveryLocation) {
      return calculateDistance(
        gpsLocation.lat,
        gpsLocation.lon,
        deliveryLocation.lat,
        deliveryLocation.lon
      )
    }
    
    // 3. 如果配送员位置存在但没有客户位置，返回0（等待客户位置）
    if (deliveryLocation) {
      return 0
    }
    
    // 4. 如果都没有位置信息，返回0
    return 0
  }, [gpsLocation, useGPS, deliveryLocation, merchantLocation])

  // GPS定位功能
  const handleGPSLocation = () => {
    setIsLocating(true)
    setLocationError("")
    
    if (!navigator.geolocation) {
      setLocationError("您的浏览器不支持GPS定位功能")
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          // 使用逆地理编码API获取地址（这里使用Nominatim作为示例，实际项目中可以使用高德、百度等API）
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
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
          const city = data.address?.city || data.address?.town || data.address?.county || "未知城市"
          
          setGpsLocation({
            lat: latitude,
            lon: longitude,
            address: address,
            city: city,
          })
          setDeliveryAddress(address)
          setDeliveryCity(city)
          setUseGPS(true)
          setIsLocating(false)
          
          // 保存商户位置到数据库
          try {
            if (typeof window === "undefined") return
            const merchantId = localStorage.getItem("merchantId") || "default"
            await fetch("/api/merchant/location", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                merchantId: merchantId,
                lat: latitude,
                lon: longitude,
                address: address,
                city: city,
              }),
            })
            // 更新本地商户位置状态
            setMerchantLocation({
              lat: latitude,
              lon: longitude,
              address: address,
              city: city,
              merchantId: merchantId,
            })
          } catch (error) {
            console.error("保存商户位置失败:", error)
          }
        } catch (error) {
          // 如果API调用失败，使用坐标作为地址
          const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          setGpsLocation({
            lat: latitude,
            lon: longitude,
            address: address,
            city: "GPS定位",
          })
          setDeliveryAddress(address)
          setDeliveryCity("GPS定位")
          setUseGPS(true)
          setIsLocating(false)
          
          // 保存商户位置到数据库（即使地址解析失败）
          try {
            if (typeof window === "undefined") return
            const merchantId = localStorage.getItem("merchantId") || "default"
            await fetch("/api/merchant/location", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                merchantId: merchantId,
                lat: latitude,
                lon: longitude,
                address: address,
                city: "GPS定位",
              }),
            })
            // 更新本地商户位置状态
            setMerchantLocation({
              lat: latitude,
              lon: longitude,
              address: address,
              city: "GPS定位",
              merchantId: merchantId,
            })
          } catch (error) {
            console.error("保存商户位置失败:", error)
          }
        }
      },
      (error) => {
        setIsLocating(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("用户拒绝了定位请求")
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError("位置信息不可用")
            break
          case error.TIMEOUT:
            setLocationError("定位请求超时")
            break
          default:
            setLocationError("定位失败，请重试")
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  // 计算实际数量（根据燃料类型）
  const actualQuantity = useMemo(() => {
    const fuel = fuelTypes.find((f) => f.id === selectedFuel)
    if (fuel?.quantityType === "bottle") {
      // 瓶装燃料：规格 × 瓶数
      const quantity = selectedSpec * bottleCount
      return Math.max(0, quantity) // 确保不为负数
    }
    return Math.max(0, fuelQuantity) // 确保不为负数
  }, [selectedFuel, selectedSpec, bottleCount, fuelQuantity])

  // 计算价格
  const orderInfo = useMemo(() => {
    const fuel = fuelTypes.find((f) => f.id === selectedFuel) || fuelTypes[0]
    // 确保数量和距离不为负数
    const safeQuantity = Math.max(0, actualQuantity)
    const safeDistance = Math.max(0, distance)
    
    // 计算每100公里单价增加0.2元/L或0.2元/kg
    // 例如：200公里 = 2个100公里 = 单价增加0.4元
    const priceIncreasePer100km = 0.2 // 每100公里增加0.2元
    const priceIncrease = Math.ceil(safeDistance / 100) * priceIncreasePer100km
    
    // 计算新的单价（基础单价 + 距离增加的单价）
    const adjustedUnitPrice = fuel.basePrice + priceIncrease
    
    // 计算基础价格（使用原始单价）
    const basePrice = fuel.basePrice * safeQuantity
    
    // 计算距离增加的费用（单价增加 × 数量）
    const distanceFee = priceIncrease * safeQuantity
    
    // 总价 = 基础价格 + 距离增加的费用
    const totalAmount = basePrice + distanceFee

    // 生成数量文本
    let quantityText = ""
    if (fuel.quantityType === "bottle") {
      quantityText = `${selectedSpec}KG/瓶 × ${bottleCount}瓶 = ${actualQuantity}KG ${fuel.name}`
    } else {
      quantityText = `${actualQuantity}${fuel.unitLabel}${fuel.name}`
    }

    return {
      service: serviceType,
      fuelType: fuel.name,
      fuelUnit: fuel.unitLabel,
      quantity: actualQuantity,
      basePrice,
      distanceFee,
      amount: totalAmount,
      quantityText,
      deliveryAddress: useGPS && gpsLocation ? `${gpsLocation.address} (GPS定位)` : deliveryAddress,
      distance: distance,
      useGPS: useGPS,
      estimatedTime: distance <= 100 ? "预计2小时内送达" : distance <= 300 ? "预计4小时内送达" : "预计6-8小时送达",
      orderId: `ORD${Date.now()}`,
      adjustedUnitPrice, // 调整后的单价（用于显示）
      priceIncrease, // 单价增加量（用于显示）
    }
  }, [selectedFuel, actualQuantity, deliveryCity, deliveryAddress, distance, serviceType, useGPS, gpsLocation, selectedSpec, bottleCount])

  const handlePayment = async () => {
    // 确保只在客户端执行
    if (typeof window === "undefined") return
    
    // 获取当前用户的 restaurant_id
    if (typeof window === "undefined") {
      setError("无法在服务器端获取用户信息")
      return
    }
    const restaurantId = localStorage.getItem("restaurantId")
    
    if (!restaurantId) {
      alert("请先登录或注册餐厅")
      return
    }

    setIsProcessingPayment(true)

    try {
      // 第一步：创建订单
      const orderResponse = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          product_type: selectedFuel === "lpg" ? "liquefied_gas" : selectedFuel === "alcohol" ? "methanol" : selectedFuel === "clean" ? "clean_fuel" : null, // 添加产品类型
          service_type: `${fuelTypes.find((f) => f.id === selectedFuel)?.name || "燃料配送"} - ${actualQuantity}${fuelTypes.find((f) => f.id === selectedFuel)?.unitLabel || "kg"}`,
          status: "processing", // 使用新状态：processing（待派单）
          amount: orderInfo.amount,
        }),
      })

      const orderResult = await orderResponse.json()

      if (!orderResponse.ok) {
        throw new Error(orderResult.error || "创建订单失败")
      }

      const orderId = orderResult.data?.id

      if (!orderId) {
        throw new Error("订单创建失败：未返回订单ID")
      }

      // 保存当前订单信息到localStorage
      try {
        const orderDataToSave = {
          selectedFuel,
          fuelQuantity,
          selectedSpec: (selectedFuel === "lpg" || selectedFuel === "alcohol") ? selectedSpec : undefined,
          bottleCount: (selectedFuel === "lpg" || selectedFuel === "alcohol") ? bottleCount : undefined,
          cleanFuelIndex: selectedFuel === "clean" ? cleanFuelIndex : undefined,
          deliveryCity,
          deliveryAddress,
          selectedPayment,
          gpsLocation: gpsLocation ? {
            lat: gpsLocation.lat,
            lon: gpsLocation.lon,
            address: gpsLocation.address,
            city: gpsLocation.city,
          } : null,
          useGPS,
          savedAt: Date.now(),
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("lastSuccessfulOrder", JSON.stringify(orderDataToSave))
        }
      } catch (error) {
        console.error("保存订单信息失败:", error)
      }

      // 第二步：根据支付方式处理支付
      if (selectedPayment === "alipay") {
        // 支付宝支付：创建支付订单并跳转
        const paymentResponse = await fetch("/api/payment/alipay/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            amount: orderInfo.amount,
            subject: `${fuelTypes.find((f) => f.id === selectedFuel)?.name || "燃料配送"} - ${actualQuantity}${fuelTypes.find((f) => f.id === selectedFuel)?.unitLabel || "kg"}`,
            returnUrl: typeof window !== "undefined" ? `${window.location.origin}/payment/callback?status=success&out_trade_no=${orderId}` : "",
            notifyUrl: typeof window !== "undefined" ? `${window.location.origin}/api/payment/alipay/notify` : "",
          }),
        })

        const paymentResult = await paymentResponse.json()

        if (!paymentResponse.ok || !paymentResult.success) {
          throw new Error(paymentResult.error || "创建支付订单失败")
        }

        // 跳转到支付宝支付页面
        if (paymentResult.paymentUrl) {
          if (typeof window !== "undefined") {
            window.location.href = paymentResult.paymentUrl
          } else {
            throw new Error("无法在服务器端执行页面跳转")
          }
        } else {
          throw new Error("未获取到支付链接")
        }
      } else if (selectedPayment === "wechat") {
        // 微信支付：TODO - 实现微信支付流程
        alert(`订单已创建！微信支付功能开发中，订单号：${orderId}`)
        setIsProcessingPayment(false)
      } else if (selectedPayment === "bank") {
        // 银行卡支付：TODO - 实现银行卡支付流程
        alert(`订单已创建！银行卡支付功能开发中，订单号：${orderId}`)
        setIsProcessingPayment(false)
      } else {
        // 其他支付方式
        alert(`订单已创建！使用${paymentMethods.find((p) => p.id === selectedPayment)?.name}支付 ¥${orderInfo.amount.toFixed(2)}`)
        setIsProcessingPayment(false)
      }
    } catch (error: any) {
      console.error("支付处理失败:", error)
      alert("支付处理失败: " + (error.message || "未知错误"))
      setIsProcessingPayment(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 返回按钮和记忆提示 */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </Link>
          {isLoadedFromMemory && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              ✓ 已加载上次订单信息
            </Badge>
          )}
        </div>

        {/* 燃料选择 */}
        <Card className="bg-slate-900/90 border-slate-700/50 backdrop-blur-sm p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            选择燃料类型
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {fuelTypes.map((fuel) => {
              const isSelected = selectedFuel === fuel.id
              return (
                <button
                  key={fuel.id}
                  onClick={() => {
                    setSelectedFuel(fuel.id)
                    // 根据燃料类型设置默认数量
                    if (fuel.quantityType === "bottle") {
                      setSelectedSpec(50) // 默认选择50KG规格
                      setBottleCount(1) // 默认1瓶
                    } else if (fuel.quantityType === "incremental") {
                      setCleanFuelIndex(0) // 重置到第一个选项（200L）
                      setFuelQuantity(200) // 默认起订200L
                    } else {
                      setFuelQuantity(50) // 户外环保燃料默认50KG
                    }
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{fuel.name}</h3>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-orange-400" />}
                  </div>
                  <p className="text-sm text-slate-400">
                    {fuel.basePrice}元/{fuel.unitLabel}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="space-y-4">
            {(() => {
              const currentFuel = fuelTypes.find((f) => f.id === selectedFuel)
              if (currentFuel?.quantityType === "bottle") {
                // 液化气和醇基燃料：规格选择 + 数量选择器（分段预设 + 手动微调）
                const totalQuantity = selectedSpec * bottleCount
                const minBottles = 1
                const maxBottles = 100
                const stepBottles = 1
                
                // 快捷预设值（总公斤数）
                const presetQuantities = [50, 100, 200] // 根据常用规格预设
                
                // 处理快捷按钮点击
                const handlePresetClick = (targetQuantity: number) => {
                  // 计算最接近的瓶数
                  const targetBottles = Math.round(targetQuantity / selectedSpec)
                  const finalBottles = Math.max(minBottles, Math.min(maxBottles, targetBottles))
                  setBottleCount(finalBottles)
                  // 触感反馈
                  if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(10)
                  }
                  // 触发呼吸灯闪烁
                  setIsSliderPulsing(true)
                  setTimeout(() => setIsSliderPulsing(false), 600)
                }
                
                // 处理滑块变化
                const handleSliderChange = (newValue: number[]) => {
                  const newBottles = Math.round(newValue[0])
                  if (newBottles !== bottleCount) {
                    setBottleCount(Math.max(minBottles, Math.min(maxBottles, newBottles)))
                    // 触感反馈
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                      navigator.vibrate(10)
                    }
                    // 触发呼吸灯闪烁
                    setIsSliderPulsing(true)
                    setTimeout(() => setIsSliderPulsing(false), 600)
                  }
                }
                
                // 计算滑块百分比
                const sliderValue = ((bottleCount - minBottles) / (maxBottles - minBottles)) * 100
                
                return (
                  <>
                    <div>
                      <Label className="text-slate-300 mb-3 block">规格（公斤/瓶）</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {bottleSpecs.map((spec) => (
                          <button
                            key={spec}
                            onClick={() => {
                              setSelectedSpec(spec)
                            }}
                            className={`p-3 rounded-xl border-2 transition-all ${
                              selectedSpec === spec
                                ? "border-blue-500 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 shadow-lg shadow-blue-500/30"
                                : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-blue-500/50 hover:bg-slate-700/50"
                            }`}
                          >
                            <div className={`font-bold text-lg ${selectedSpec === spec ? "text-blue-400" : "text-slate-300"}`}>
                              {spec}KG
                            </div>
                            <div className="text-xs text-slate-400 mt-1">瓶装</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-slate-300 mb-3 block">数量（瓶）</Label>
                      
                      {/* 分段预设快捷按钮 */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {presetQuantities.map((preset) => {
                          const presetBottles = Math.round(preset / selectedSpec)
                          const isActive = Math.abs(totalQuantity - preset) < selectedSpec / 2
                          return (
                            <button
                              key={preset}
                              onClick={() => handlePresetClick(preset)}
                              className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                                isActive
                                  ? "border-blue-500 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 shadow-lg shadow-blue-500/30"
                                  : "border-slate-700 bg-slate-800/50 hover:border-blue-500/50 hover:bg-slate-700/50"
                              }`}
                            >
                              {/* 选中时的发光效果 */}
                              {isActive && (
                                <div className="absolute inset-0 rounded-xl bg-blue-500/20 blur-md animate-pulse"></div>
                              )}
                              <div className="relative z-10">
                                <div className={`text-2xl font-bold ${isActive ? "text-blue-400" : "text-slate-300"}`}>
                                  {preset}KG
                                </div>
                                <div className="text-xs text-slate-400 mt-1">约 {presetBottles} 瓶</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      
                      {/* 手动微调滑块 */}
                      <div className="space-y-4">
                        {/* 当前值显示 */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">当前数量</span>
                          <div className="text-right">
                            <div className={`text-3xl font-bold transition-all duration-300 ${
                              isSliderPulsing ? "text-blue-400 scale-110" : "text-white"
                            }`}>
                              {bottleCount} 瓶
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                              共 {totalQuantity}KG
                            </div>
                          </div>
                        </div>
                        
                        {/* 渐变蓝色进度条滑块 */}
                        <div className="relative">
                          <div className="relative">
                            {/* 滑块轨道背景 */}
                            <div className="relative h-4 bg-slate-800/50 rounded-full border border-slate-700/50 overflow-hidden backdrop-blur-sm">
                              {/* 渐变蓝色进度条 - 带呼吸灯效果 */}
                              <div 
                                className={`absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-full transition-all duration-300 ${
                                  isSliderPulsing ? "animate-pulse" : ""
                                }`}
                                style={{
                                  width: `${sliderValue}%`,
                                  boxShadow: isSliderPulsing 
                                    ? "0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(59, 130, 246, 0.3)" 
                                    : "0 0 10px rgba(59, 130, 246, 0.4), inset 0 0 10px rgba(59, 130, 246, 0.2)",
                                }}
                              />
                              
                              {/* 滑块组件 - 自定义样式 */}
                              <Slider
                                value={[bottleCount]}
                                min={minBottles}
                                max={maxBottles}
                                step={stepBottles}
                                onValueChange={handleSliderChange}
                                className="[&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-thumb]]:border-blue-500 [&_[data-slot=slider-thumb]]:bg-gradient-to-br [&_[data-slot=slider-thumb]]:from-blue-500 [&_[data-slot=slider-thumb]]:to-cyan-500 [&_[data-slot=slider-thumb]]:shadow-lg [&_[data-slot=slider-thumb]]:shadow-blue-500/50 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:ring-2 [&_[data-slot=slider-thumb]]:ring-blue-500/30 hover:[&_[data-slot=slider-thumb]]:shadow-blue-500/70 hover:[&_[data-slot=slider-thumb]]:scale-110"
                              />
                            </div>
                            
                            {/* 范围标签 */}
                            <div className="flex justify-between mt-3 text-xs text-slate-500">
                              <span>{minBottles} 瓶</span>
                              <span>{maxBottles} 瓶</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 提示信息 */}
                        <p className="text-xs text-slate-500 text-center">
                          可手动微调瓶数，范围 1-100 瓶
                        </p>
                      </div>
                    </div>
                  </>
                )
              } else if (currentFuel?.quantityType === "incremental") {
                // 热能清洁燃料：数量选择器（分段预设 + 手动微调）
                const options = getCleanFuelOptions()
                const validIndex = Math.max(0, Math.min(cleanFuelIndex, options.length - 1))
                const currentValue = options[validIndex] || 200
                const minValue = 200
                const maxValue = 2000
                const step = 50
                
                // 快捷预设值
                const presetValues = [200, 300, 500]
                
                // 处理快捷按钮点击
                const handlePresetClick = (value: number) => {
                  const targetIndex = options.findIndex(opt => opt === value)
                  if (targetIndex !== -1) {
                    setCleanFuelIndex(targetIndex)
                    // 触感反馈
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                      navigator.vibrate(10)
                    }
                    // 触发呼吸灯闪烁
                    setIsSliderPulsing(true)
                    setTimeout(() => setIsSliderPulsing(false), 600)
                  }
                }
                
                // 处理滑块变化
                const handleSliderChange = (newValue: number[]) => {
                  const value = newValue[0]
                  // 找到最接近的选项索引
                  const targetIndex = options.findIndex(opt => opt >= value)
                  const finalIndex = targetIndex !== -1 ? targetIndex : options.length - 1
                  
                  if (finalIndex !== validIndex) {
                    setCleanFuelIndex(finalIndex)
                    // 触感反馈
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                      navigator.vibrate(10)
                    }
                    // 触发呼吸灯闪烁
                    setIsSliderPulsing(true)
                    setTimeout(() => setIsSliderPulsing(false), 600)
                  }
                }
                
                // 计算滑块百分比
                const sliderValue = ((currentValue - minValue) / (maxValue - minValue)) * 100
                
                return (
                  <div>
                    <Label className="text-slate-300 mb-3 block">
                      数量 ({currentFuel.unitLabel})
                    </Label>
                    
                    {/* 分段预设快捷按钮 */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {presetValues.map((preset) => {
                        const isActive = currentValue === preset
                        return (
                          <button
                            key={preset}
                            onClick={() => handlePresetClick(preset)}
                            className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                              isActive
                                ? "border-blue-500 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 shadow-lg shadow-blue-500/30"
                                : "border-slate-700 bg-slate-800/50 hover:border-blue-500/50 hover:bg-slate-700/50"
                            }`}
                          >
                            {/* 选中时的发光效果 */}
                            {isActive && (
                              <div className="absolute inset-0 rounded-xl bg-blue-500/20 blur-md animate-pulse"></div>
                            )}
                            <div className="relative z-10">
                              <div className={`text-2xl font-bold ${isActive ? "text-blue-400" : "text-slate-300"}`}>
                                {preset}L
                              </div>
                              <div className="text-xs text-slate-400 mt-1">快捷选择</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    
                    {/* 手动微调滑块 */}
                    <div className="space-y-4">
                      {/* 当前值显示 */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">当前数量</span>
                        <div className={`text-3xl font-bold transition-all duration-300 ${
                          isSliderPulsing ? "text-blue-400 scale-110" : "text-white"
                        }`}>
                          {currentValue}L
                        </div>
                      </div>
                      
                      {/* 渐变蓝色进度条滑块 */}
                      <div className="relative">
                        {/* 自定义滑块容器 */}
                        <div className="relative">
                          {/* 滑块轨道背景 */}
                          <div className="relative h-4 bg-slate-800/50 rounded-full border border-slate-700/50 overflow-hidden backdrop-blur-sm">
                            {/* 渐变蓝色进度条 - 带呼吸灯效果 */}
                            <div 
                              className={`absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-full transition-all duration-300 ${
                                isSliderPulsing ? "animate-pulse" : ""
                              }`}
                              style={{
                                width: `${sliderValue}%`,
                                boxShadow: isSliderPulsing 
                                  ? "0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(59, 130, 246, 0.3)" 
                                  : "0 0 10px rgba(59, 130, 246, 0.4), inset 0 0 10px rgba(59, 130, 246, 0.2)",
                              }}
                            />
                            
                            {/* 滑块组件 - 自定义样式 */}
                            <Slider
                              value={[currentValue]}
                              min={minValue}
                              max={maxValue}
                              step={step}
                              onValueChange={handleSliderChange}
                              className="[&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-thumb]]:border-blue-500 [&_[data-slot=slider-thumb]]:bg-gradient-to-br [&_[data-slot=slider-thumb]]:from-blue-500 [&_[data-slot=slider-thumb]]:to-cyan-500 [&_[data-slot=slider-thumb]]:shadow-lg [&_[data-slot=slider-thumb]]:shadow-blue-500/50 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:ring-2 [&_[data-slot=slider-thumb]]:ring-blue-500/30 hover:[&_[data-slot=slider-thumb]]:shadow-blue-500/70 hover:[&_[data-slot=slider-thumb]]:scale-110"
                            />
                          </div>
                          
                          {/* 范围标签 */}
                          <div className="flex justify-between mt-3 text-xs text-slate-500">
                            <span>{minValue}L</span>
                            <span>{maxValue}L</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 提示信息 */}
                      <p className="text-xs text-slate-500 text-center">
                        起订200L，以50L为增量单位，可手动微调
                      </p>
                    </div>
                  </div>
                )
              } else {
                // 户外环保燃料：数量选择器（分段预设 + 手动微调）
                const minValue = 1
                const maxValue = 1000
                const step = 1
                
                // 快捷预设值
                const presetValues = [50, 100, 200]
                
                // 处理快捷按钮点击
                const handlePresetClick = (value: number) => {
                  setFuelQuantity(value)
                  // 触感反馈
                  if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(10)
                  }
                  // 触发呼吸灯闪烁
                  setIsSliderPulsing(true)
                  setTimeout(() => setIsSliderPulsing(false), 600)
                }
                
                // 处理滑块变化
                const handleSliderChange = (newValue: number[]) => {
                  const value = Math.round(newValue[0])
                  if (value !== fuelQuantity) {
                    setFuelQuantity(Math.max(minValue, Math.min(maxValue, value)))
                    // 触感反馈
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                      navigator.vibrate(10)
                    }
                    // 触发呼吸灯闪烁
                    setIsSliderPulsing(true)
                    setTimeout(() => setIsSliderPulsing(false), 600)
                  }
                }
                
                // 计算滑块百分比
                const sliderValue = ((fuelQuantity - minValue) / (maxValue - minValue)) * 100
                
                return (
                  <div>
                    <Label className="text-slate-300 mb-3 block">
                      数量 ({currentFuel?.unitLabel})
                    </Label>
                    
                    {/* 分段预设快捷按钮 */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {presetValues.map((preset) => {
                        const isActive = fuelQuantity === preset
                        return (
                          <button
                            key={preset}
                            onClick={() => handlePresetClick(preset)}
                            className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                              isActive
                                ? "border-blue-500 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 shadow-lg shadow-blue-500/30"
                                : "border-slate-700 bg-slate-800/50 hover:border-blue-500/50 hover:bg-slate-700/50"
                            }`}
                          >
                            {/* 选中时的发光效果 */}
                            {isActive && (
                              <div className="absolute inset-0 rounded-xl bg-blue-500/20 blur-md animate-pulse"></div>
                            )}
                            <div className="relative z-10">
                              <div className={`text-2xl font-bold ${isActive ? "text-blue-400" : "text-slate-300"}`}>
                                {preset}{currentFuel?.unitLabel}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">快捷选择</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    
                    {/* 手动微调滑块 */}
                    <div className="space-y-4">
                      {/* 当前值显示 */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">当前数量</span>
                        <div className={`text-3xl font-bold transition-all duration-300 ${
                          isSliderPulsing ? "text-blue-400 scale-110" : "text-white"
                        }`}>
                          {fuelQuantity}{currentFuel?.unitLabel}
                        </div>
                      </div>
                      
                      {/* 渐变蓝色进度条滑块 */}
                      <div className="relative">
                        <div className="relative">
                          {/* 滑块轨道背景 */}
                          <div className="relative h-4 bg-slate-800/50 rounded-full border border-slate-700/50 overflow-hidden backdrop-blur-sm">
                            {/* 渐变蓝色进度条 - 带呼吸灯效果 */}
                            <div 
                              className={`absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-full transition-all duration-300 ${
                                isSliderPulsing ? "animate-pulse" : ""
                              }`}
                              style={{
                                width: `${sliderValue}%`,
                                boxShadow: isSliderPulsing 
                                  ? "0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(59, 130, 246, 0.3)" 
                                  : "0 0 10px rgba(59, 130, 246, 0.4), inset 0 0 10px rgba(59, 130, 246, 0.2)",
                              }}
                            />
                            
                            {/* 滑块组件 - 自定义样式 */}
                            <Slider
                              value={[fuelQuantity]}
                              min={minValue}
                              max={maxValue}
                              step={step}
                              onValueChange={handleSliderChange}
                              className="[&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-thumb]]:border-blue-500 [&_[data-slot=slider-thumb]]:bg-gradient-to-br [&_[data-slot=slider-thumb]]:from-blue-500 [&_[data-slot=slider-thumb]]:to-cyan-500 [&_[data-slot=slider-thumb]]:shadow-lg [&_[data-slot=slider-thumb]]:shadow-blue-500/50 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:ring-2 [&_[data-slot=slider-thumb]]:ring-blue-500/30 hover:[&_[data-slot=slider-thumb]]:shadow-blue-500/70 hover:[&_[data-slot=slider-thumb]]:scale-110"
                            />
                          </div>
                          
                          {/* 范围标签 */}
                          <div className="flex justify-between mt-3 text-xs text-slate-500">
                            <span>{minValue}{currentFuel?.unitLabel}</span>
                            <span>{maxValue}{currentFuel?.unitLabel}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 提示信息 */}
                      <p className="text-xs text-slate-500 text-center">
                        可手动微调数量，范围 {minValue}-{maxValue}{currentFuel?.unitLabel}
                      </p>
                    </div>
                  </div>
                )
              }
            })()}

            <div>
              <Label className="text-slate-300 mb-2 block flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                配送地址
              </Label>
              
              {/* GPS定位按钮 */}
              <div className="mb-3">
                <Button
                  type="button"
                  onClick={handleGPSLocation}
                  disabled={isLocating || useGPS}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      定位中...
                    </>
                  ) : useGPS ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      GPS定位成功
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4 mr-2" />
                      GPS定位
                    </>
                  )}
                </Button>
                {locationError && (
                  <p className="text-xs text-red-400 mt-1">{locationError}</p>
                )}
                {useGPS && gpsLocation && (
                  <>
                    {deliveryLocation && (
                      <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        已使用GPS定位，距离配送员 {distance}公里
                      </p>
                    )}
                    {!deliveryLocation && (
                      <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        已使用GPS定位，等待配送员位置信息
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* 城市选择（GPS定位时禁用） */}
              {!useGPS && (
                <div className="mb-3">
                  <Label className="text-slate-300 mb-2 block text-sm">配送城市</Label>
                  <select
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    className="w-full h-10 rounded-md border border-slate-700 bg-slate-800/50 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.keys(cityDistances).map((city) => (
                      <option key={city} value={city} className="bg-slate-800">
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 详细地址（可修改） */}
              <div>
                <Label className="text-slate-300 mb-2 block text-sm">详细地址</Label>
                <Input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white"
                  placeholder="请输入详细地址"
                />
                {useGPS && gpsLocation && (
                  <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    GPS定位地址已自动填充，可手动修改
                  </p>
                )}
              </div>

              {/* 显示距离信息 */}
              {distance > 0 && (
                <div className="mt-2 p-2 bg-slate-800/30 rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">配送距离</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {distance}公里
                    </Badge>
                  </div>
                  {deliveryLocation && merchantLocation && (
                    <div className="text-xs text-slate-500">
                      ✓ 基于配送员实时位置与商户注册地址计算
                    </div>
                  )}
                  {deliveryLocation && !merchantLocation && (
                    <div className="text-xs text-slate-500">
                      ⚠ 使用配送员位置，商户位置未注册
                    </div>
                  )}
                  {!deliveryLocation && (
                    <div className="text-xs text-slate-500">
                      ⚠ 等待配送员位置信息，距离暂未计算
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 订单信息 */}
        <Card className="bg-slate-900/90 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">订单确认</h1>
              <p className="text-sm text-slate-400">订单号: {orderInfo.orderId}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-slate-800">
              <span className="text-slate-400">服务项目</span>
              <span className="text-white font-semibold">{orderInfo.service}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-800">
              <span className="text-slate-400">燃料类型</span>
              <span className="text-white">{orderInfo.fuelType}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-800">
              <span className="text-slate-400">服务详情</span>
              <span className="text-white">{orderInfo.quantityText}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-800">
              <span className="text-slate-400">配送地址</span>
              <div className="text-right max-w-[60%]">
                <span className="text-white">{orderInfo.deliveryAddress}</span>
                {orderInfo.useGPS && (
                  <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    GPS定位
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-800">
              <span className="text-slate-400">配送距离</span>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                {orderInfo.distance}公里
              </Badge>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-800">
              <span className="text-slate-400">预计送达</span>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{orderInfo.estimatedTime}</Badge>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3 space-y-2 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">燃料单价</span>
                <span className="text-white">
                  ¥{orderInfo.adjustedUnitPrice.toFixed(2)}/{orderInfo.fuelUnit}
                  {orderInfo.priceIncrease > 0 && (
                    <span className="text-xs text-orange-400 ml-1">
                      (含距离加价¥{orderInfo.priceIncrease.toFixed(2)})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">燃料费用</span>
                <span className="text-white">¥{orderInfo.basePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">距离加价费用</span>
                <span className="text-white">
                  ¥{orderInfo.distanceFee.toFixed(2)}
                  {orderInfo.distance > 0 && (
                    <span className="text-xs text-slate-500 ml-1">
                      ({Math.ceil(orderInfo.distance / 100)}个100公里 × ¥0.2/{orderInfo.fuelUnit})
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <span className="text-lg font-semibold text-white">订单金额</span>
              <span className="text-2xl font-bold text-red-400">¥{orderInfo.amount.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* 支付方式选择 */}
        <Card className="bg-slate-900/90 border-slate-700/50 backdrop-blur-sm p-6">
          <h2 className="text-lg font-semibold text-white mb-4">选择支付方式</h2>
          <div className="space-y-3">
            {paymentMethods.map((method) => {
              const isSelected = selectedPayment === method.id
              const Icon = method.icon
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${method.color} rounded-xl flex items-center justify-center shadow-lg ${method.shadowColor}`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{method.name}</h3>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-blue-400" />
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{method.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* 支付按钮 */}
        <div className="sticky bottom-24 pb-4">
          <Button
            onClick={handlePayment}
            disabled={isProcessingPayment}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-14 text-lg font-semibold shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              `确认支付 ¥${orderInfo.amount.toFixed(2)}`
            )}
          </Button>
          <p className="text-xs text-slate-500 text-center mt-2">点击支付即表示同意《服务协议》和《支付协议》</p>
          {process.env.NODE_ENV !== 'production' && selectedPayment === 'alipay' && (
            <p className="text-xs text-orange-400 text-center mt-1">⚠️ 沙箱环境：请使用支付宝沙箱账号进行支付测试</p>
          )}
        </div>
      </div>
      <BottomNavigation />
    </main>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
        <Header />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-white">加载中...</div>
        </div>
        <BottomNavigation />
      </main>
    }>
      <PaymentContent />
    </Suspense>
  )
}

