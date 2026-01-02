"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRequest } from "@/lib/api-client"
import {
  Wrench,
  MapPin,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Phone,
  DollarSign,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Repair {
  id: string
  restaurant_id: string
  service_type: string
  status: string
  description: string
  amount: number
  urgency?: string
  created_at: string
  updated_at: string
  restaurants: {
    id: string
    name: string
    address: string | null
    contact_phone: string | null
  } | null
}

interface RepairListProps {
  workerId?: string | null // 工人ID（可选，用于筛选已接单的工单）
  statusFilter?: "pending" | "processing" | "completed" | "all" // 状态筛选
}

export function WorkerRepairList({ workerId, statusFilter = "all" }: RepairListProps) {
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [repairAmount, setRepairAmount] = useState("")
  const [isCompleting, setIsCompleting] = useState(false)

  // 加载维修工单列表
  useEffect(() => {
    loadRepairs()
  }, [statusFilter])

  const loadRepairs = async () => {
    setIsLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      
      // 如果提供了workerId，添加到请求头
      if (workerId) {
        headers["x-worker-id"] = workerId
      }

      const response = await fetch(`/api/repair/list?${params.toString()}`, {
        headers,
      })
      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || "加载维修工单失败")
      }

      setRepairs(result.data || [])
    } catch (err: any) {
      console.error("[工人端] 加载维修工单失败:", err)
      setError(err.message || "加载维修工单失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 接收维修工单（从pending转为processing）
  const handleAcceptRepair = async (repairId: string) => {
    setIsUpdating(true)
    setError("")

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      
      // 如果提供了workerId，添加到请求头
      if (workerId) {
        headers["x-worker-id"] = workerId
      }

      const result = await apiRequest({
        endpoint: "/api/repair/update",
        method: "POST",
        headers,
        body: {
          repair_id: repairId,
          status: "processing",
          worker_id: workerId || undefined,
        },
        showToast: true,
        successMessage: "维修工单接收成功",
        errorMessage: "接收维修工单失败",
        operationType: "repair",
        enableOfflineStorage: true,
      })

      if (!result.success) {
        throw new Error(result.error || "接收维修工单失败")
      }

      // 刷新列表
      await loadRepairs()
    } catch (err: any) {
      console.error("[工人端] 接收维修工单失败:", err)
      setError(err.message || "接收维修工单失败")
    } finally {
      setIsUpdating(false)
    }
  }

  // 完成维修工单
  const handleCompleteRepair = async () => {
    if (!selectedRepair) return

    if (!repairAmount || parseFloat(repairAmount) <= 0) {
      setError("请输入有效的维修金额")
      return
    }

    setIsCompleting(true)
    setError("")

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      
      // 如果提供了workerId，添加到请求头
      if (workerId) {
        headers["x-worker-id"] = workerId
      }

      const result = await apiRequest({
        endpoint: "/api/repair/update",
        method: "POST",
        headers,
        body: {
          repair_id: selectedRepair.id,
          status: "completed",
          amount: parseFloat(repairAmount),
          worker_id: workerId || undefined,
        },
        showToast: true,
        successMessage: "维修工单完成成功",
        errorMessage: "完成维修工单失败",
        operationType: "repair",
        enableOfflineStorage: true,
      })

      if (!result.success) {
        throw new Error(result.error || "完成维修工单失败")
      }

      // 刷新列表
      await loadRepairs()
      // 关闭对话框
      setIsDetailDialogOpen(false)
      setSelectedRepair(null)
      setRepairAmount("")
    } catch (err: any) {
      console.error("[工人端] 完成维修工单失败:", err)
      setError(err.message || "完成维修工单失败")
    } finally {
      setIsCompleting(false)
    }
  }

  // 打开详情对话框
  const openDetailDialog = (repair: Repair) => {
    setSelectedRepair(repair)
    setRepairAmount(repair.amount > 0 ? repair.amount.toString() : "")
    setIsDetailDialogOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "processing":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "待处理"
      case "processing":
        return "处理中"
      case "completed":
        return "已完成"
      case "cancelled":
        return "已取消"
      default:
        return status
    }
  }

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case "high":
        return "text-red-400"
      case "medium":
        return "text-yellow-400"
      case "low":
        return "text-green-400"
      default:
        return "text-slate-400"
    }
  }

  const getUrgencyLabel = (urgency?: string) => {
    switch (urgency) {
      case "high":
        return "高"
      case "medium":
        return "中"
      case "low":
        return "低"
      default:
        return "未设置"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-yellow-400 mr-2" />
        <span className="text-slate-400">加载维修工单中...</span>
      </div>
    )
  }

  if (error && !repairs.length) {
    return (
      <Card className="bg-red-500/10 border-red-500/30 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </Card>
    )
  }

  if (repairs.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800/50 p-8">
        <div className="text-center">
          <Wrench className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">暂无维修工单</p>
        </div>
      </Card>
    )
  }

  return (
    <>
      {error && (
        <Card className="bg-red-500/10 border-red-500/30 p-4 mb-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {repairs.map((repair) => {
          const canAccept = repair.status === "pending"
          const canComplete = repair.status === "processing"

          return (
            <Card
              key={repair.id}
              className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-4 cursor-pointer hover:border-yellow-500/50 transition-all"
              onClick={() => openDetailDialog(repair)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-medium text-white">工单号: {repair.id.slice(0, 8)}</span>
                    <Badge className={`text-xs ${getStatusColor(repair.status)}`}>
                      {getStatusLabel(repair.status)}
                    </Badge>
                    {repair.urgency && (
                      <Badge className={`text-xs ${getUrgencyColor(repair.urgency)} border-current/30`}>
                        紧急: {getUrgencyLabel(repair.urgency)}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-slate-300 mb-2 line-clamp-2">{repair.description || "无描述"}</p>

                  {repair.restaurants && (
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        <span className="text-white">{repair.restaurants.name}</span>
                      </div>
                      {repair.restaurants.address && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <MapPin className="h-3 w-3" />
                          <span>{repair.restaurants.address}</span>
                        </div>
                      )}
                      {repair.restaurants.contact_phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Phone className="h-3 w-3" />
                          <span>{repair.restaurants.contact_phone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-400">
                    {new Date(repair.created_at).toLocaleString("zh-CN")}
                  </span>
                  {repair.amount > 0 && (
                    <>
                      <DollarSign className="h-3 w-3 text-slate-400 ml-2" />
                      <span className="text-white font-medium">¥{repair.amount.toFixed(2)}</span>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  {canAccept && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAcceptRepair(repair.id)
                      }}
                      disabled={isUpdating}
                      size="sm"
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          接收中...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          接收工单
                        </>
                      )}
                    </Button>
                  )}

                  {canComplete && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        openDetailDialog(repair)
                      }}
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      完成维修
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* 维修工单详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Wrench className="h-5 w-5 text-yellow-400" />
              维修工单详情
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedRepair?.status === "processing" ? "填写维修金额并完成工单" : "查看工单详情"}
            </DialogDescription>
          </DialogHeader>

          {selectedRepair && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="space-y-2">
                <Label className="text-slate-300">餐厅信息</Label>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-white font-medium">
                    {selectedRepair.restaurants?.name || "未知餐厅"}
                  </p>
                  {selectedRepair.restaurants?.address && (
                    <p className="text-sm text-slate-400 mt-1">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {selectedRepair.restaurants.address}
                    </p>
                  )}
                  {selectedRepair.restaurants?.contact_phone && (
                    <p className="text-sm text-slate-400 mt-1">
                      <Phone className="h-3 w-3 inline mr-1" />
                      {selectedRepair.restaurants.contact_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* 问题描述 */}
              <div className="space-y-2">
                <Label className="text-slate-300">问题描述</Label>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-white">{selectedRepair.description || "无描述"}</p>
                </div>
              </div>

              {/* 当前状态 */}
              <div className="space-y-2">
                <Label className="text-slate-300">当前状态</Label>
                <Badge className={getStatusColor(selectedRepair.status)}>
                  {getStatusLabel(selectedRepair.status)}
                </Badge>
              </div>

              {/* 紧急程度 */}
              {selectedRepair.urgency && (
                <div className="space-y-2">
                  <Label className="text-slate-300">紧急程度</Label>
                  <Badge className={`${getUrgencyColor(selectedRepair.urgency)} border-current/30`}>
                    {getUrgencyLabel(selectedRepair.urgency)}
                  </Badge>
                </div>
              )}

              {/* 维修金额（处理中状态时显示） */}
              {selectedRepair.status === "processing" && (
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    维修金额 <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="请输入维修金额"
                    value={repairAmount}
                    onChange={(e) => setRepairAmount(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}

              {/* 时间信息 */}
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
                <div>
                  <span className="text-slate-500">创建时间:</span>
                  <p className="text-white mt-1">
                    {new Date(selectedRepair.created_at).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">更新时间:</span>
                  <p className="text-white mt-1">
                    {new Date(selectedRepair.updated_at).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDetailDialogOpen(false)
                setSelectedRepair(null)
                setRepairAmount("")
              }}
              className="text-slate-400 hover:text-white"
              disabled={isCompleting}
            >
              关闭
            </Button>
            {selectedRepair?.status === "processing" && (
              <Button
                onClick={handleCompleteRepair}
                disabled={isCompleting || !repairAmount || parseFloat(repairAmount) <= 0}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    完成中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    完成维修
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

