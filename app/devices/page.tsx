"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  MapPin,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Wrench,
  Activity,
  Building2,
  Clock,
  DollarSign,
  Info,
  FileText,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useFinancialViewPermission } from "@/hooks/use-financial-view-permission"
import { logBusinessWarning } from "@/lib/utils/logger"

export default function DevicesPage() {
  const router = useRouter()
  const [devices, setDevices] = useState<Array<{
    device_id: string
    model: string | null
    address: string | null
    installer: string | null
    install_date: string | null
    status: string | null
    created_at: string | null
    // 租赁状态信息
    lease_status?: {
      contract_no?: string | null
      start_at?: string | null
      end_at?: string | null
      lessor_type?: 'platform' | 'manufacturer' | 'leasing_company' | 'finance_partner' | null
      is_overdue?: boolean
    } | null
    // 金融视图信息（仅用于显示，不参与业务逻辑）
    financial_view?: {
      agreed_daily_fee?: number | null
      agreed_monthly_fee?: number | null
      billing_model?: 'fixed' | 'usage_based' | 'hybrid' | null
    } | null
  }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true) // 初始化状态：正在读取 localStorage
  const [error, setError] = useState("")
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  
  // 金融视图权限检查
  const { canView: canViewFinancialView, isLoading: isCheckingFinancialPermission } = useFinancialViewPermission()

  // 路由保护：检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsLoggedIn(false)
        router.push('/')
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          // 游客访问，重定向到首页
          setIsLoggedIn(false)
          router.push('/')
          return
        }
        setIsLoggedIn(true)
      } catch (error) {
        logBusinessWarning('设备页面', '检查登录状态失败', error)
        setIsLoggedIn(false)
        router.push('/')
      }
    }

    checkAuth()
  }, [router])

  // 首先读取 localStorage 中的 restaurantId
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsInitializing(false)
      return
    }
    
    // 立即读取，避免延迟
    const rid = localStorage.getItem("restaurantId")
    setRestaurantId(rid)
    setIsInitializing(false) // 标记初始化完成
  }, [])

  // 读取到 restaurantId 后再加载设备数据
  // ⚠️ 权限检查：等待金融视图权限检查完成后再加载数据
  useEffect(() => {
    // 如果还在初始化，不执行
    if (isInitializing) return
    
    // 如果还在检查金融视图权限，等待完成
    if (isCheckingFinancialPermission) return

    if (!restaurantId || !supabase) {
      if (!restaurantId) {
        setError("请先登录")
      } else {
        setError("数据库连接失败")
      }
      setIsLoading(false)
      return
    }

    const loadDevices = async () => {
      try {
        setIsLoading(true)
        setError("")

        // ⚠️ 权限检查：只有管理员才查询金融字段（agreed_daily_fee, agreed_monthly_fee）
        // 权限不足时不请求金融字段，避免"闪一下钱"
        const shouldQueryFinancialFields = canViewFinancialView && !isCheckingFinancialPermission

        // 查询所有已激活的设备
        const { data: devicesData, error: devicesError } = await supabase
          .from("devices")
          .select("device_id, model, address, installer, install_date, status, created_at")
          .eq("restaurant_id", restaurantId)
          .in("status", ["active", "online"])
          .order("install_date", { ascending: false })

        if (devicesError) {
          logBusinessWarning('设备页面', '查询设备失败', devicesError)
          setError("查询设备失败")
          return
        }

        // 查询每个设备的租赁状态和合同信息
        if (devicesData && devicesData.length > 0) {
          const deviceIds = devicesData.map((d) => d.device_id)
          
          // 1. 查询活跃的租赁记录（device_rentals）
          const { data: rentalsData, error: rentalsError } = await supabase
            .from("device_rentals")
            .select("device_id, status, start_at, end_at")
            .in("device_id", deviceIds)
            .eq("status", "active")
            .is("end_at", null)

          if (rentalsError) {
            console.warn("查询设备租赁状态失败（不影响主流程）:", rentalsError)
          }

          // 2. 查询租赁合同信息（rental_contracts）和合同设备关系（rental_contract_devices）
          // ⚠️ 权限检查：根据权限动态选择查询字段
          // 权限不足时不请求金融字段，避免"闪一下钱"
          const contractDevicesSelect = shouldQueryFinancialFields
            ? "device_id, rental_contract_id, agreed_daily_fee, agreed_monthly_fee, agreed_usage_metric"
            : "device_id, rental_contract_id, agreed_usage_metric"
          
          const { data: contractDevicesData, error: contractDevicesError } = await supabase
            .from("rental_contract_devices")
            .select(contractDevicesSelect)
            .in("device_id", deviceIds)

          if (contractDevicesError) {
            console.warn("查询合同设备关系失败（不影响主流程）:", contractDevicesError)
          }

          // 获取所有合同ID
          const contractIds = contractDevicesData?.map((cd) => cd.rental_contract_id) || []
          
          // 查询合同信息
          let contractsData: any[] = []
          if (contractIds.length > 0) {
            const { data: contracts, error: contractsError } = await supabase
              .from("rental_contracts")
              .select("id, contract_no, lessee_restaurant_id, lessor_type, start_at, end_at, billing_model, status")
              .in("id", contractIds)
              .eq("status", "active")

            if (contractsError) {
              console.warn("查询租赁合同失败（不影响主流程）:", contractsError)
            } else {
              contractsData = contracts || []
            }
          }

          // 3. 合并所有信息到设备数据中
          const devicesWithLeaseInfo = devicesData.map((device) => {
            // 查找租赁记录
            const rental = rentalsData?.find((r) => r.device_id === device.device_id)
            
            // 查找合同设备关系
            const contractDevice = contractDevicesData?.find((cd) => cd.device_id === device.device_id)
            
            // 查找对应的合同
            const contract = contractDevice 
              ? contractsData.find((c) => c.id === contractDevice.rental_contract_id)
              : null

            // 判断是否逾期（如果合同存在且结束日期已过）
            const isOverdue = contract && contract.end_at 
              ? new Date(contract.end_at) < new Date()
              : false

            return {
              ...device,
              lease_status: rental || contract ? {
                contract_no: contract?.contract_no || null,
                start_at: contract?.start_at || rental?.start_at || null,
                end_at: contract?.end_at || rental?.end_at || null,
                lessor_type: contract?.lessor_type || null,
                is_overdue: isOverdue,
              } : null,
              // ⚠️ 权限检查：只有管理员才填充金融视图数据
              // 权限不足时不填充，避免"闪一下钱"
              financial_view: contractDevice && shouldQueryFinancialFields ? {
                agreed_daily_fee: contractDevice.agreed_daily_fee,
                agreed_monthly_fee: contractDevice.agreed_monthly_fee,
                billing_model: contract?.billing_model || null,
              } : null,
            }
          })

          setDevices(devicesWithLeaseInfo)
        } else {
          setDevices([])
        }
      } catch (err: any) {
        logBusinessWarning('设备页面', '加载设备失败', err)
        setError(err.message || "加载失败")
      } finally {
        setIsLoading(false)
      }
    }

    loadDevices()
  }, [restaurantId, isCheckingFinancialPermission])

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            已激活
          </Badge>
        )
      case "online":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Activity className="h-3 w-3 mr-1" />
            在线
          </Badge>
        )
      case "offline":
        return (
          <Badge className="bg-muted text-muted-foreground border-border">
            <AlertCircle className="h-3 w-3 mr-1" />
            离线
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status || "未知"}
          </Badge>
        )
    }
  }

  // 如果未登录，不渲染页面内容（等待重定向）
  if (isLoggedIn === false) {
    return (
      <main className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-foreground">正在跳转...</div>
      </main>
    )
  }

  // 如果登录状态还在检查中，显示加载中
  if (isLoggedIn === null) {
    return (
      <main className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">检查权限中...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <Header />

      {/* 页面标题 */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted/50">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">我的设备</h1>
            <p className="text-sm text-muted-foreground">查看已激活的设备列表</p>
          </div>
        </div>

        {/* 加载中（包括初始化阶段） */}
        {(isLoading || isInitializing) && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">加载中...</p>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && !isLoading && !isInitializing && (
          <Card className="glass-breath p-6 mb-6 border-destructive/30 bg-destructive/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div>
                <h3 className="text-lg font-bold text-destructive mb-1">加载失败</h3>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* 设备列表 */}
        {!isLoading && !isInitializing && !error && (
          <>
            {devices.length === 0 ? (
              <Card className="glass-breath p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-muted/50 flex items-center justify-center mx-auto mb-4 border border-border" style={{ borderRadius: 'var(--radius-card)' }}>
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">暂无设备</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    您还没有已激活的设备
                  </p>
                  <Link href="/customer/confirm">
                    <Button className="theme-button bg-primary hover:bg-primary/90 text-primary-foreground">
                      前往确认验收
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    共 {devices.length} 台设备
                  </p>
                </div>

                {devices.map((device) => (
                  <div key={device.device_id} className="space-y-4">
                    {/* ========================================
                        层级 1: Device Facts（设备事实）
                        ======================================== */}
                    <Card semanticLevel="primary_fact" className="glass-breath">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0" style={{ borderRadius: 'var(--radius-button)' }}>
                            <Package className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="text-lg font-bold text-foreground">
                                {device.device_id}
                              </h3>
                              {getStatusBadge(device.status)}
                            </div>
                            {device.model && (
                              <p className="text-sm text-muted-foreground mb-1">
                                型号: {device.model}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {device.address && (
                            <div className="flex items-start gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">安装地址</p>
                                <p className="text-sm text-foreground">{device.address}</p>
                              </div>
                            </div>
                          )}

                          {device.installer && (
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">安装人</p>
                                <p className="text-sm text-foreground">{device.installer}</p>
                              </div>
                            </div>
                          )}

                          {device.install_date && (
                            <div className="flex items-center gap-3">
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">安装日期</p>
                                <p className="text-sm text-foreground">
                                  {new Date(device.install_date).toLocaleString("zh-CN")}
                                </p>
                              </div>
                            </div>
                          )}

                          {device.created_at && (
                            <div className="flex items-center gap-3">
                              <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">创建时间</p>
                                <p className="text-sm text-foreground">
                                  {new Date(device.created_at).toLocaleString("zh-CN")}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* ========================================
                        层级 2: Lease Status（租赁状态）
                        ======================================== */}
                    {device.lease_status && (
                      <Card className="glass-breath border-blue-500/30 bg-blue-500/5">
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-400" />
                            <h3 className="text-lg font-bold text-foreground">租赁状态</h3>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {device.lease_status.contract_no && (
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-0.5">合同编号</p>
                                  <p className="text-sm text-foreground font-mono">
                                    {device.lease_status.contract_no}
                                  </p>
                                </div>
                              </div>
                            )}

                            {device.lease_status.start_at && (
                              <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-0.5">租赁开始时间</p>
                                  <p className="text-sm text-foreground">
                                    {new Date(device.lease_status.start_at).toLocaleDateString("zh-CN")}
                                  </p>
                                </div>
                              </div>
                            )}

                            {device.lease_status.end_at && (
                              <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-0.5">租赁结束时间</p>
                                  <p className="text-sm text-foreground">
                                    {new Date(device.lease_status.end_at).toLocaleDateString("zh-CN")}
                                  </p>
                                </div>
                              </div>
                            )}

                            {device.lease_status.lessor_type && (
                              <div className="flex items-center gap-3">
                                <Building2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-0.5">出租方</p>
                                  <p className="text-sm text-foreground">
                                    {device.lease_status.lessor_type === 'platform' ? '平台' :
                                     device.lease_status.lessor_type === 'manufacturer' ? '厂家' :
                                     device.lease_status.lessor_type === 'leasing_company' ? '租赁公司' :
                                     device.lease_status.lessor_type === 'finance_partner' ? '金融机构' :
                                     device.lease_status.lessor_type}
                                  </p>
                                </div>
                              </div>
                            )}

                            {device.lease_status.is_overdue !== undefined && (
                              <div className="flex items-center gap-3">
                                <Clock className={`h-4 w-4 flex-shrink-0 ${device.lease_status.is_overdue ? 'text-destructive' : 'text-green-400'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-0.5">是否逾期</p>
                                  <Badge className={device.lease_status.is_overdue 
                                    ? "bg-destructive/20 text-destructive border-destructive/30"
                                    : "bg-green-500/20 text-green-400 border-green-500/30"
                                  }>
                                    {device.lease_status.is_overdue ? (
                                      <>
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        已逾期
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        正常
                                      </>
                                    )}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* ========================================
                        层级 3: Financial View（金融视图）
                        ======================================== */}
                    {/* ⚠️ 权限检查：只有管理员可见金融视图 */}
                    {/* 权限不足时不渲染、不请求 API */}
                    {device.financial_view && canViewFinancialView && !isCheckingFinancialPermission && (
                      <Card className="bg-muted/30 border-muted text-muted-foreground">
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-medium text-muted-foreground">财务视图 / 估算视图</h3>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            {device.financial_view.billing_model && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">计费模式：</span>
                                <span className="text-muted-foreground">
                                  {device.financial_view.billing_model === 'fixed' ? '固定费用' :
                                   device.financial_view.billing_model === 'usage_based' ? '按使用量计费' :
                                   device.financial_view.billing_model === 'hybrid' ? '混合模式' :
                                   device.financial_view.billing_model}
                                </span>
                              </div>
                            )}
                            {device.financial_view.agreed_daily_fee !== null && device.financial_view.agreed_daily_fee !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">日租金（约定）：</span>
                                <span className="text-muted-foreground">
                                  ¥{device.financial_view.agreed_daily_fee.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {device.financial_view.agreed_monthly_fee !== null && device.financial_view.agreed_monthly_fee !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">月租金（约定）：</span>
                                <span className="text-muted-foreground">
                                  ¥{device.financial_view.agreed_monthly_fee.toFixed(2)}
                                </span>
                              </div>
                            )}
                            <div className="pt-2 border-t border-muted text-xs text-muted-foreground/70">
                              <Info className="h-3 w-3 inline mr-1" />
                              以上金额仅为合同约定记录，不参与业务逻辑判断
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNavigation />
    </main>
  )
}

