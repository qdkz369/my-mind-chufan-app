"use client"

/**
 * 客户端注册/登录页面
 * 
 * 核心功能：
 * - 支持注册新餐厅
 * - 支持已有账号登录
 * - 使用Tab切换注册/登录模式
 * - 登录成功后保存restaurant_id到localStorage，自动重定向
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle, CheckCircle2, UserPlus, LogIn, Store, MapPin } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"register" | "login">("register")
  
  // 注册表单状态
  const [registerData, setRegisterData] = useState({
    name: "",
    phone: "",
    restaurant_name: "",
    address: "",
  })
  
  // 登录表单状态
  const [loginPhone, setLoginPhone] = useState("")
  
  // UI状态
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 获取地理位置
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    // 尝试获取地理位置（可选）
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.warn("[注册页面] 获取地理位置失败:", error)
          setLocationError("无法获取位置信息，您可以稍后手动设置")
        },
        { timeout: 5000 }
      )
    }
  }, [])

  // 注册处理
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      // 验证必填字段
      if (!registerData.name || !registerData.phone || !registerData.restaurant_name) {
        throw new Error("请填写所有必填字段")
      }

      // 验证手机号格式（简单验证）
      const phoneRegex = /^1[3-9]\d{9}$/
      if (!phoneRegex.test(registerData.phone)) {
        throw new Error("请输入正确的手机号格式")
      }

      // 调用注册API
      const response = await fetch("/api/restaurant/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: registerData.name.trim(),
          phone: registerData.phone.trim(),
          restaurant_name: registerData.restaurant_name.trim(),
          address: registerData.address.trim() || undefined,
          latitude: location?.latitude,
          longitude: location?.longitude,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "注册失败，请重试")
      }

      if (!result.success) {
        throw new Error(result.error || "注册失败")
      }

      // 注册成功，保存restaurant_id到localStorage
      if (result.data?.restaurant_id) {
        localStorage.setItem("restaurantId", result.data.restaurant_id.toString())
        setSuccess("注册成功！正在跳转...")
        
        // 等待一下让用户看到成功提示
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 重定向到首页，身份调度层会自动识别身份
        router.push("/")
      } else {
        throw new Error("注册成功但未获取到餐厅ID，请联系客服")
      }
    } catch (err: any) {
      console.error("[注册页面] 注册失败:", err)
      setError(err.message || "注册失败，请重试")
      setIsLoading(false)
    }
  }

  // 登录处理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      // 验证手机号
      if (!loginPhone) {
        throw new Error("请输入手机号")
      }

      const phoneRegex = /^1[3-9]\d{9}$/
      if (!phoneRegex.test(loginPhone)) {
        throw new Error("请输入正确的手机号格式")
      }

      // 调用登录API
      const response = await fetch("/api/restaurant/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: loginPhone.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          // 未找到账号，提示用户注册
          setError("该手机号未注册，请先注册账户")
          setIsLoading(false)
          return
        }
        throw new Error(result.error || "登录失败，请重试")
      }

      if (!result.success) {
        throw new Error(result.error || "登录失败")
      }

      // 登录成功，保存restaurant_id到localStorage
      if (result.data?.restaurant_id) {
        localStorage.setItem("restaurantId", result.data.restaurant_id.toString())
        setSuccess("登录成功！正在跳转...")
        
        // 等待一下让用户看到成功提示
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 重定向到首页，身份调度层会自动识别身份
        router.push("/")
      } else {
        throw new Error("登录成功但未获取到餐厅ID，请联系客服")
      }
    } catch (err: any) {
      console.error("[注册页面] 登录失败:", err)
      setError(err.message || "登录失败，请重试")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <Store className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">餐厅账户</CardTitle>
          <CardDescription className="text-center">
            注册新账户或登录已有账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as "register" | "login")
            setError(null)
            setSuccess(null)
          }}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="register" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                注册
              </TabsTrigger>
              <TabsTrigger value="login" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                登录
              </TabsTrigger>
            </TabsList>

            {/* 注册表单 */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-green-500/10 border-green-500/50 text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">联系人姓名 <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="请输入您的姓名"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">手机号 <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="请输入11位手机号"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    required
                    disabled={isLoading}
                    maxLength={11}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restaurant_name">餐厅名称 <span className="text-red-500">*</span></Label>
                  <Input
                    id="restaurant_name"
                    type="text"
                    placeholder="请输入餐厅名称"
                    value={registerData.restaurant_name}
                    onChange={(e) => setRegisterData({ ...registerData, restaurant_name: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">餐厅地址（可选）</Label>
                  <div className="relative">
                    <Input
                      id="address"
                      type="text"
                      placeholder="请输入餐厅地址"
                      value={registerData.address}
                      onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                      disabled={isLoading}
                    />
                    {location && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <MapPin className="h-4 w-4 text-green-500" title="已自动获取位置" />
                      </div>
                    )}
                  </div>
                  {locationError && (
                    <p className="text-xs text-yellow-500">{locationError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      注册中...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      立即注册
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  已有账号？<button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    点击登录
                  </button>
                </p>
              </form>
            </TabsContent>

            {/* 登录表单 */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                    {error.includes("未注册") && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab("register")}
                          className="w-full"
                        >
                          前往注册
                        </Button>
                      </div>
                    )}
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-green-500/10 border-green-500/50 text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="login_phone">手机号 <span className="text-red-500">*</span></Label>
                  <Input
                    id="login_phone"
                    type="tel"
                    placeholder="请输入注册时的手机号"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    required
                    disabled={isLoading}
                    maxLength={11}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      立即登录
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  还没有账号？<button
                    type="button"
                    onClick={() => setActiveTab("register")}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    点击注册
                  </button>
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
