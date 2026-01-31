// 协议管理：Tabs（协议管理 = AgreementManagement，租赁合同管理 = 合同列表 + 详情对话框）
// 从 page.tsx renderAgreements 提取，仅保留 Tabs + 租赁合同管理逻辑

"use client"

import { useState, useCallback, useEffect } from "react"
import { FileText, AlertCircle, ChevronRight, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AgreementManagement } from "../agreement-management"
import { supabase } from "@/lib/supabase"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import { logBusinessWarning } from "@/lib/utils/logger"

export function AgreementsSection() {
  const [agreementsTabValue, setAgreementsTabValue] = useState<string>("agreements")
  const [rentalContracts, setRentalContracts] = useState<any[]>([])
  const [isLoadingRentalContracts, setIsLoadingRentalContracts] = useState(false)
  const [rentalContractsError, setRentalContractsError] = useState<string | null>(null)
  const [selectedRentalContract, setSelectedRentalContract] = useState<any | null>(null)
  const [isRentalContractDetailDialogOpen, setIsRentalContractDetailDialogOpen] = useState(false)
  const [contractPaymentInfo, setContractPaymentInfo] = useState<any[]>([])
  const [isLoadingPaymentInfo, setIsLoadingPaymentInfo] = useState(false)

  const loadRentalContracts = useCallback(async (retryCount = 0) => {
    setIsLoadingRentalContracts(true)
    setRentalContractsError(null)
    try {
      const response = await fetchWithAuth("/api/admin/rental/contracts", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          const errorMsg = result.details || result.error || "未授权，请先登录"
          if (retryCount === 0 && supabase) {
            try {
              const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
              if (!refreshError && session) {
                return loadRentalContracts(1)
              }
            } catch {
              // ignore
            }
          }
          const detailedError =
            retryCount > 0
              ? "认证失败：请检查是否已登录及用户角色（需要 admin 或 super_admin）"
              : errorMsg
          logBusinessWarning("协议管理", "加载租赁合同失败", { errorMsg: detailedError })
          setRentalContractsError(detailedError)
          setRentalContracts([])
          return
        }
        if (response.status === 403) {
          setRentalContractsError(`权限不足：${result.details || result.error || "仅管理员可访问"}`)
          setRentalContracts([])
          return
        }
        if (response.status === 500) {
          setRentalContractsError(result.details || result.error || "查询租赁合同失败")
          setRentalContracts([])
          return
        }
      }

      if (result.success) {
        setRentalContracts(result.data || [])
        setRentalContractsError(null)
      } else {
        setRentalContractsError(result.error || result.details || "获取租赁合同列表失败")
        setRentalContracts([])
      }
    } catch (err: any) {
      setRentalContractsError(err.message || "网络请求失败")
      setRentalContracts([])
      logBusinessWarning("协议管理", "加载租赁合同失败", err)
    } finally {
      setIsLoadingRentalContracts(false)
    }
  }, [])

  const loadContractPaymentInfo = useCallback(async () => {
    if (!selectedRentalContract) return
    setIsLoadingPaymentInfo(true)
    try {
      const headers: HeadersInit = {}
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
      }
      const response = await fetchWithAuth("/api/equipment/rental/admin/list", {
        credentials: "include",
        headers,
      })
      const result = await response.json()
      if (result.success) {
        const relatedOrders = (result.data || []).filter(
          (order: any) => order.restaurant_id === selectedRentalContract.lessee_restaurant_id
        )
        setContractPaymentInfo(relatedOrders)
      } else {
        setContractPaymentInfo([])
      }
    } catch (err: any) {
      logBusinessWarning("协议管理", "加载支付信息失败", err)
      setContractPaymentInfo([])
    } finally {
      setIsLoadingPaymentInfo(false)
    }
  }, [selectedRentalContract])

  useEffect(() => {
    if (agreementsTabValue === "contracts") {
      loadRentalContracts()
    }
  }, [agreementsTabValue, loadRentalContracts])

  useEffect(() => {
    if (selectedRentalContract && isRentalContractDetailDialogOpen) {
      loadContractPaymentInfo()
    }
  }, [selectedRentalContract, isRentalContractDetailDialogOpen, loadContractPaymentInfo])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">协议管理</h1>
        <p className="text-slate-400">管理服务协议、支付协议、隐私协议等各类协议内容</p>
      </div>

      <Tabs value={agreementsTabValue} onValueChange={setAgreementsTabValue} className="space-y-4">
        <TabsList className="bg-slate-800/50 border-slate-700/50">
          <TabsTrigger value="agreements" className="data-[state=active]:bg-blue-600">
            协议管理
          </TabsTrigger>
          <TabsTrigger value="contracts" className="data-[state=active]:bg-blue-600">
            租赁合同管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agreements" className="space-y-4">
          <AgreementManagement />
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card semanticLevel="secondary_fact" className="bg-slate-800/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-400">总合同数</CardDescription>
                <CardTitle className="text-2xl text-white">{rentalContracts.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card semanticLevel="secondary_fact" className="bg-yellow-800/50 border-yellow-700/50">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-400">草稿</CardDescription>
                <CardTitle className="text-2xl text-yellow-400">
                  {rentalContracts.filter((c) => c.status === "draft").length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card semanticLevel="secondary_fact" className="bg-green-800/50 border-green-700/50">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-400">生效中</CardDescription>
                <CardTitle className="text-2xl text-green-400">
                  {rentalContracts.filter((c) => c.status === "active").length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card semanticLevel="secondary_fact" className="bg-slate-700/50 border-slate-600/50">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-400">已结束</CardDescription>
                <CardTitle className="text-2xl text-slate-400">
                  {rentalContracts.filter((c) => c.status === "ended").length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card semanticLevel="secondary_fact" className="bg-red-800/50 border-red-700/50">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-400">违约</CardDescription>
                <CardTitle className="text-2xl text-red-400">
                  {rentalContracts.filter((c) => c.status === "breached").length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {rentalContractsError && (
            <Card semanticLevel="secondary_fact" className="bg-red-900/50 border-red-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="flex-1">
                    <p className="text-red-400 font-medium">加载失败</p>
                    <p className="text-red-300 text-sm mt-1">{rentalContractsError}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadRentalContracts()}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    重试
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoadingRentalContracts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
              <span className="text-slate-400">加载中...</span>
            </div>
          ) : rentalContracts.length === 0 ? (
            <Card semanticLevel="system_hint" className="bg-slate-900/50 border-slate-800 p-8 text-center">
              <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">暂无租赁合同</p>
              <p className="text-sm text-slate-500">租赁合同将从设备租赁订单中自动创建</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {rentalContracts.map((contract) => {
                const getContractStatusColor = (status: string) => {
                  switch (status) {
                    case "draft":
                      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    case "active":
                      return "bg-green-500/20 text-green-400 border-green-500/30"
                    case "ended":
                      return "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    case "breached":
                      return "bg-red-500/20 text-red-400 border-red-500/30"
                    default:
                      return "bg-slate-500/20 text-slate-400 border-slate-500/30"
                  }
                }
                const getContractStatusLabel = (status: string) => {
                  switch (status) {
                    case "draft":
                      return "草稿"
                    case "active":
                      return "生效中"
                    case "ended":
                      return "已结束"
                    case "breached":
                      return "违约"
                    default:
                      return status
                  }
                }
                return (
                  <Card
                    key={contract.id}
                    semanticLevel="secondary_fact"
                    className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 cursor-pointer hover:border-blue-500/50 transition-colors"
                    onClick={() => {
                      setSelectedRentalContract(contract)
                      setIsRentalContractDetailDialogOpen(true)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-white">合同号：{contract.contract_no}</h3>
                            <Badge className={getContractStatusColor(contract.status)}>
                              {getContractStatusLabel(contract.status)}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-slate-400">
                            <p>承租人餐厅ID：{contract.lessee_restaurant_id}</p>
                            <p>出租人类型：{contract.lessor_type}</p>
                            <p>计费模式：{contract.billing_model}</p>
                            <p>
                              合同期限：{new Date(contract.start_at).toLocaleDateString("zh-CN")} 至{" "}
                              {new Date(contract.end_at).toLocaleDateString("zh-CN")}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={isRentalContractDetailDialogOpen}
        onOpenChange={setIsRentalContractDetailDialogOpen}
      >
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">租赁合同详情</DialogTitle>
            <DialogDescription className="text-slate-400">
              查看合同信息和关联的支付记录
            </DialogDescription>
          </DialogHeader>
          {selectedRentalContract && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">合同号：</span>
                  <span className="text-white font-semibold">{selectedRentalContract.contract_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">承租人餐厅ID：</span>
                  <span className="text-white">{selectedRentalContract.lessee_restaurant_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">出租人类型：</span>
                  <span className="text-white">{selectedRentalContract.lessor_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">计费模式：</span>
                  <span className="text-white">{selectedRentalContract.billing_model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">合同期限：</span>
                  <span className="text-white">
                    {new Date(selectedRentalContract.start_at).toLocaleDateString("zh-CN")} 至{" "}
                    {new Date(selectedRentalContract.end_at).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">状态：</span>
                  <Badge
                    className={
                      selectedRentalContract.status === "active"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : selectedRentalContract.status === "draft"
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    }
                  >
                    {selectedRentalContract.status === "active"
                      ? "生效中"
                      : selectedRentalContract.status === "draft"
                      ? "草稿"
                      : "已结束"}
                  </Badge>
                </div>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-3">关联订单和支付记录</h4>
                {isLoadingPaymentInfo ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-2" />
                    <span className="text-slate-400">加载中...</span>
                  </div>
                ) : contractPaymentInfo.length === 0 ? (
                  <p className="text-slate-400 text-sm">暂无关联的订单</p>
                ) : (
                  <div className="space-y-3">
                    {contractPaymentInfo.map((order: any) => {
                      const monthlyPayments = (order.monthly_payments as any[]) || []
                      return (
                        <Card
                          key={order.id}
                          semanticLevel="secondary_fact"
                          className="bg-slate-900/50 border-slate-700/50"
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-white font-semibold">订单号：{order.order_number}</p>
                                  <p className="text-slate-400 text-sm mt-1">
                                    设备：{order.equipment?.name || "未知"}
                                  </p>
                                  <p className="text-slate-400 text-sm">
                                    月租金：¥{order.monthly_rental_price} × {order.rental_period} 个月
                                  </p>
                                </div>
                                <Badge
                                  className={
                                    order.order_status === "active"
                                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                                      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  }
                                >
                                  {order.order_status === "active" ? "租赁中" : "待确认"}
                                </Badge>
                              </div>
                              {monthlyPayments.length > 0 && (
                                <div className="border-t border-slate-700/50 pt-3">
                                  <p className="text-slate-400 text-sm mb-2">支付记录：</p>
                                  <div className="space-y-1">
                                    {monthlyPayments.map((payment: any, index: number) => (
                                      <div
                                        key={index}
                                        className="flex justify-between items-center text-sm bg-slate-800/50 p-2 rounded"
                                      >
                                        <span className="text-slate-300">{payment.month}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-white">¥{payment.amount}</span>
                                          {payment.status === "paid" ? (
                                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                              已支付
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                              待支付
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRentalContract(null)
                    setIsRentalContractDetailDialogOpen(false)
                  }}
                  className="border-slate-600 text-slate-300"
                >
                  关闭
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
