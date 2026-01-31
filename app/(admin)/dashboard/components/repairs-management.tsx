"use client"

// 报修管理组件
// 从 page.tsx 的 renderRepairs() 函数提取

import {
  Wrench,
  Droplet,
  HardHat,
  Building2,
  Phone,
  User,
  Clock,
  MapPin,
  Mic,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Repair, Restaurant, Worker } from "../types/dashboard-types"

function getStatusColor(status: string) {
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

function getStatusLabel(status: string) {
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

function getUrgencyColor(urgency?: string) {
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

function getUrgencyLabel(urgency?: string) {
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

function getServiceTypeInfo(serviceType: string) {
  const normalizedType = (serviceType || "").toLowerCase()
  if (serviceType === "维修服务" || serviceType.includes("维修") || normalizedType.includes("repair")) {
    return {
      icon: Wrench,
      label: "维修服务",
      color: "bg-green-500/20 text-green-400 border-green-500/30",
      iconColor: "text-green-400",
    }
  }
  if (serviceType === "清洁服务" || serviceType.includes("清洁") || serviceType.includes("清洗") || normalizedType.includes("clean")) {
    return {
      icon: Droplet,
      label: "清洁服务",
      color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      iconColor: "text-cyan-400",
    }
  }
  if (serviceType === "工程改造" || serviceType.includes("改造") || serviceType.includes("工程") || normalizedType.includes("renovation") || normalizedType.includes("construction")) {
    return {
      icon: HardHat,
      label: "工程改造",
      color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      iconColor: "text-purple-400",
    }
  }
  return {
    icon: Wrench,
    label: serviceType || "未知服务",
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    iconColor: "text-slate-400",
  }
}

interface RepairsManagementProps {
  repairs: Repair[]
  isLoadingRepairs: boolean
  repairStatusFilter: string
  onRepairStatusFilterChange: (value: string) => void
  repairServiceTypeFilter: string
  onRepairServiceTypeFilterChange: (value: string) => void
  restaurants: Restaurant[]
  workers: Worker[]
  selectedRepair: Repair | null
  onSelectedRepairChange: (repair: Repair | null) => void
  isRepairDetailDialogOpen: boolean
  onRepairDetailDialogOpenChange: (open: boolean) => void
  repairUpdateStatus: string
  onRepairUpdateStatusChange: (value: string) => void
  repairUpdateAmount: string
  onRepairUpdateAmountChange: (value: string) => void
  repairAssignedWorker: string
  onRepairAssignedWorkerChange: (value: string) => void
  platformRecommendation?: {
    recommended_worker_id: string
    recommended_worker_name: string | null
    reason: string
    takeover_mode?: "shadow" | "suggest" | "enforced"
  } | null
  repairRejectedReason?: string
  onRepairRejectedReasonChange?: (value: string) => void
  repairRejectedCategory?: string
  onRepairRejectedCategoryChange?: (value: string) => void
  isUpdatingRepair: boolean
  onUpdateRepairStatus: (
    repairId: string,
    status: string,
    amount?: number,
    assignedTo?: string,
    rejectedReason?: string,
    rejectedCategory?: string
  ) => void
}

export function RepairsManagement({
  repairs,
  isLoadingRepairs,
  repairStatusFilter,
  onRepairStatusFilterChange,
  repairServiceTypeFilter,
  onRepairServiceTypeFilterChange,
  restaurants,
  workers,
  selectedRepair,
  onSelectedRepairChange,
  isRepairDetailDialogOpen,
  onRepairDetailDialogOpenChange,
  repairUpdateStatus,
  onRepairUpdateStatusChange,
  repairUpdateAmount,
  onRepairUpdateAmountChange,
  repairAssignedWorker,
  onRepairAssignedWorkerChange,
  platformRecommendation,
  repairRejectedReason = "",
  onRepairRejectedReasonChange,
  repairRejectedCategory = "",
  onRepairRejectedCategoryChange,
  isUpdatingRepair,
  onUpdateRepairStatus,
}: RepairsManagementProps) {
  const pendingRepairs = repairs.filter((r) => r.status === "pending")
  const processingRepairs = repairs.filter((r) => r.status === "processing")
  const completedRepairs = repairs.filter((r) => r.status === "completed")
  const cancelledRepairs = repairs.filter((r) => r.status === "cancelled")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">报修管理</h1>
        <p className="text-slate-400">管理所有报修工单和维修状态</p>
      </div>

      {/* 报修统计 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-purple-950/90 border-purple-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">总报修数</CardDescription>
            <CardTitle className="text-2xl md:text-3xl text-white">{repairs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-yellow-950/90 border-yellow-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">待处理</CardDescription>
            <CardTitle className="text-2xl md:text-3xl text-yellow-400">{pendingRepairs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">处理中</CardDescription>
            <CardTitle className="text-2xl md:text-3xl text-blue-400">{processingRepairs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-green-950/90 border-green-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">已完成</CardDescription>
            <CardTitle className="text-2xl md:text-3xl text-green-400">{completedRepairs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-red-950/90 border-red-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">已取消</CardDescription>
            <CardTitle className="text-3xl text-red-400">{cancelledRepairs.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 筛选器 */}
      <Card semanticLevel="action" className="bg-gradient-to-br from-slate-900/90 to-purple-950/90 border-purple-800/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg">筛选条件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
              状态筛选
            </label>
            <div className="flex flex-wrap gap-2.5">
              {["all", "pending", "processing", "completed", "cancelled"].map((status) => (
                <Button
                  key={status}
                  variant={repairStatusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => onRepairStatusFilterChange(status)}
                  className={
                    repairStatusFilter === status
                      ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/30 border-0 px-4 h-9 font-medium transition-all"
                      : "border-slate-600/50 text-slate-300 hover:bg-slate-800/50 hover:border-slate-500 hover:text-white px-4 h-9 font-medium transition-all"
                  }
                >
                  {status === "all" ? "全部" : getStatusLabel(status)}
                </Button>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-700/50"></div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
              服务类型筛选
            </label>
            <div className="flex flex-wrap gap-2.5">
              {[
                { value: "all", label: "全部", icon: null },
                { value: "repair", label: "维修服务", icon: Wrench },
                { value: "cleaning", label: "清洁服务", icon: Droplet },
                { value: "renovation", label: "工程改造", icon: HardHat },
              ].map((type) => {
                const IconComponent = type.icon
                return (
                  <Button
                    key={type.value}
                    variant={repairServiceTypeFilter === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onRepairServiceTypeFilterChange(type.value)}
                    className={
                      repairServiceTypeFilter === type.value
                        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/30 border-0 px-4 h-9 font-medium transition-all"
                        : "border-slate-600/50 text-slate-300 hover:bg-slate-800/50 hover:border-slate-500 hover:text-white px-4 h-9 font-medium transition-all"
                    }
                  >
                    {IconComponent && <IconComponent className="h-3.5 w-3.5 mr-1.5" />}
                    {type.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 报修列表 */}
      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-purple-950/90 border-purple-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">报修工单列表</CardTitle>
          <CardDescription className="text-slate-400">点击工单查看详情和更新状态</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-400 font-semibold">当前加载到的工单总数：{repairs.length}</p>
          </div>

          {isLoadingRepairs ? (
            <div className="text-center py-8">
              <div className="inline-block h-6 w-6 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 mt-2 text-sm">加载中...</p>
            </div>
          ) : repairs.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">暂无报修单（已连接数据库，但未匹配到维修类型数据）</p>
            </div>
          ) : (
            <div className="space-y-3">
              {repairs.map((repair) => {
                const restaurant = restaurants.find((r) => r.id === repair.restaurant_id)
                return (
                  <div
                    key={repair.id}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:border-purple-500/50 ${
                      repair.status === "pending" ? "border-yellow-500/50 bg-yellow-500/5" : "border-slate-700/50 bg-slate-800/50"
                    }`}
                    onClick={() => {
                      onSelectedRepairChange(repair)
                      onRepairUpdateStatusChange(repair.status)
                      onRepairUpdateAmountChange(repair.amount?.toString() || "")
                      onRepairAssignedWorkerChange(repair.assigned_to || repair.worker_id || "")
                      onRepairDetailDialogOpenChange(true)
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Building2 className="h-4 w-4 text-purple-400" />
                          <span className="font-semibold text-white">{restaurant?.name || "未知餐厅"}</span>
                          <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                            {repair.id.slice(0, 8)}
                          </Badge>
                          {(() => {
                            const serviceInfo = getServiceTypeInfo(repair.service_type || "")
                            const ServiceIcon = serviceInfo.icon
                            return (
                              <Badge className={`text-xs ${serviceInfo.color} flex items-center gap-1`}>
                                <ServiceIcon className={`h-3 w-3 ${serviceInfo.iconColor}`} />
                                {serviceInfo.label}
                              </Badge>
                            )
                          })()}
                          {repair.urgency && (
                            <Badge className={`text-xs ${getUrgencyColor(repair.urgency)} border-current/30`}>
                              紧急: {getUrgencyLabel(repair.urgency)}
                            </Badge>
                          )}
                        </div>
                        {repair.audio_url && repair.audio_url.trim() !== "" && !repair.audio_url.includes("storage.example.com") && (
                          <div className="ml-6 mt-2 mb-2">
                            <audio
                              controls
                              src={repair.audio_url}
                              className="w-full mt-2"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                              }}
                            >
                              您的浏览器不支持音频播放
                            </audio>
                          </div>
                        )}
                        {repair.audio_url && repair.audio_url.includes("storage.example.com") && (
                          <div className="ml-6 mt-2 mb-2 text-xs text-slate-500 italic">[语音报修内容 - 音频文件未上传]</div>
                        )}
                        <div className="text-sm text-slate-300 ml-6 mb-1">
                          {repair.description && repair.description.trim() !== "" ? repair.description : "[语音报修内容]"}
                        </div>
                        <div className="text-xs text-slate-500 ml-6 mt-1">
                          {repair.device_id && repair.device_id.trim() !== ""
                            ? `设备ID: ${repair.device_id}`
                            : "[非设备报修：环境/通用维修]"}
                        </div>
                        {restaurant?.contact_phone && (
                          <div className="text-xs text-slate-500 ml-6 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {restaurant.contact_phone}
                          </div>
                        )}
                        {(repair.assigned_to || repair.worker_id) && (
                          <div className="text-xs text-blue-400 ml-6 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            已分配: {workers.find((w) => w.id === (repair.assigned_to || repair.worker_id))?.name || "未知工人"}
                          </div>
                        )}
                      </div>
                      <Badge className={`text-xs ${getStatusColor(repair.status)}`}>{getStatusLabel(repair.status)}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(repair.created_at).toLocaleString("zh-CN")}
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-white">
                        {repair.amount && repair.amount > 0 ? `¥${repair.amount.toFixed(2)}` : "待定价"}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 报修详情对话框 */}
      <Dialog open={isRepairDetailDialogOpen} onOpenChange={onRepairDetailDialogOpenChange}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              {(() => {
                const serviceInfo = getServiceTypeInfo(selectedRepair?.service_type || "")
                const ServiceIcon = serviceInfo.icon
                return <ServiceIcon className={`h-5 w-5 ${serviceInfo.iconColor}`} />
              })()}
              服务工单详情
              {selectedRepair?.audio_url && <Mic className="h-5 w-5 text-purple-400" />}
            </DialogTitle>
            <DialogDescription className="text-slate-400">查看服务详情并更新状态</DialogDescription>
          </DialogHeader>

          {selectedRepair && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">服务类型</Label>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  {(() => {
                    const serviceInfo = getServiceTypeInfo(selectedRepair.service_type || "")
                    const ServiceIcon = serviceInfo.icon
                    return (
                      <Badge className={`${serviceInfo.color} flex items-center gap-2 w-fit`}>
                        <ServiceIcon className={`h-4 w-4 ${serviceInfo.iconColor}`} />
                        <span>{serviceInfo.label}</span>
                      </Badge>
                    )
                  })()}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">餐厅信息</Label>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-white font-medium">
                    {restaurants.find((r) => r.id === selectedRepair.restaurant_id)?.name || "未知餐厅"}
                  </p>
                  {restaurants.find((r) => r.id === selectedRepair.restaurant_id)?.address && (
                    <p className="text-sm text-slate-400 mt-1">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {restaurants.find((r) => r.id === selectedRepair.restaurant_id)?.address}
                    </p>
                  )}
                  {restaurants.find((r) => r.id === selectedRepair.restaurant_id)?.contact_phone && (
                    <p className="text-sm text-slate-400 mt-1">
                      <Phone className="h-3 w-3 inline mr-1" />
                      {restaurants.find((r) => r.id === selectedRepair.restaurant_id)?.contact_phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">设备信息</Label>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-white">
                    {selectedRepair.device_id && selectedRepair.device_id.trim() !== ""
                      ? `设备ID: ${selectedRepair.device_id}`
                      : "[非设备报修：环境/通用维修]"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">问题描述</Label>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  {selectedRepair.audio_url && selectedRepair.audio_url.trim() !== "" && !selectedRepair.audio_url.includes("storage.example.com") && (
                    <div className="mb-3">
                      <audio controls src={selectedRepair.audio_url} className="w-full mt-2">
                        您的浏览器不支持音频播放
                      </audio>
                    </div>
                  )}
                  {selectedRepair.audio_url && selectedRepair.audio_url.includes("storage.example.com") && (
                    <div className="mb-3 text-xs text-slate-500 italic">[语音报修内容 - 音频文件未上传]</div>
                  )}
                  <p className="text-white">
                    {selectedRepair.description && selectedRepair.description.trim() !== ""
                      ? selectedRepair.description
                      : "[语音报修内容]"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">当前状态</Label>
                <Badge className={getStatusColor(selectedRepair.status)}>{getStatusLabel(selectedRepair.status)}</Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">更新状态</Label>
                <Select value={repairUpdateStatus} onValueChange={onRepairUpdateStatusChange}>
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="pending" className="text-white hover:bg-slate-700">待处理</SelectItem>
                    <SelectItem value="processing" className="text-white hover:bg-slate-700">处理中</SelectItem>
                    <SelectItem value="completed" className="text-white hover:bg-slate-700">已完成</SelectItem>
                    <SelectItem value="cancelled" className="text-white hover:bg-slate-700">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">分配工人</Label>
                {platformRecommendation && (
                  <div className="text-sm text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-2">
                    平台推荐: {platformRecommendation.recommended_worker_name ?? "未知"}（{platformRecommendation.reason}）
                  </div>
                )}
                <Select value={repairAssignedWorker} onValueChange={onRepairAssignedWorkerChange}>
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="选择工人（可选）" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none" className="text-white hover:bg-slate-700">不分配</SelectItem>
                    {workers
                      .filter((w) => {
                        const workerTypes = Array.isArray(w.worker_type)
                          ? w.worker_type
                          : typeof w.worker_type === "string"
                            ? w.worker_type.includes("repair")
                              ? ["repair"]
                              : w.worker_type.startsWith("[")
                                ? JSON.parse(w.worker_type)
                                : [w.worker_type]
                            : []
                        return workerTypes.includes("repair") || workerTypes.some((t: string) => t.includes("repair"))
                      })
                      .map((worker) => (
                        <SelectItem key={worker.id} value={worker.id} className="text-white hover:bg-slate-700">
                          {worker.name} ({worker.phone})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {platformRecommendation &&
                  repairAssignedWorker !== "none" &&
                  repairAssignedWorker !== platformRecommendation.recommended_worker_id && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">
                        拒绝原因分类
                        {platformRecommendation.takeover_mode === "suggest" && (
                          <span className="text-amber-400"> *</span>
                        )}
                      </Label>
                      <Select
                        value={repairRejectedCategory}
                        onValueChange={onRepairRejectedCategoryChange}
                      >
                        <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="选择拒绝原因类型" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="CUSTOMER_SPECIFIED" className="text-white hover:bg-slate-700">
                            客户指定
                          </SelectItem>
                          <SelectItem value="URGENT_OVERRIDE" className="text-white hover:bg-slate-700">
                            紧急覆盖
                          </SelectItem>
                          <SelectItem value="EXPERIENCE_PREFERENCE" className="text-white hover:bg-slate-700">
                            经验偏好
                          </SelectItem>
                          <SelectItem value="PLATFORM_MISMATCH" className="text-white hover:bg-slate-700">
                            平台推荐不匹配
                          </SelectItem>
                          <SelectItem value="OTHER" className="text-white hover:bg-slate-700">
                            其他
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Label className="text-slate-300">补充说明（可选）</Label>
                      <Input
                        placeholder="可补充具体原因"
                        value={repairRejectedReason}
                        onChange={(e) => onRepairRejectedReasonChange?.(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  )}
              </div>

              {repairUpdateStatus === "completed" && (
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    维修金额 <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="请输入维修金额"
                    value={repairUpdateAmount}
                    onChange={(e) => onRepairUpdateAmountChange(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
                <div>
                  <span className="text-slate-500">创建时间:</span>
                  <p className="text-white mt-1">{new Date(selectedRepair.created_at).toLocaleString("zh-CN")}</p>
                </div>
                <div>
                  <span className="text-slate-500">更新时间:</span>
                  <p className="text-white mt-1">{new Date(selectedRepair.updated_at).toLocaleString("zh-CN")}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => onRepairDetailDialogOpenChange(false)}
              className="text-slate-400 hover:text-white"
              disabled={isUpdatingRepair}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (repairUpdateStatus === "completed" && !repairUpdateAmount) {
                  alert("完成报修必须填写维修金额")
                  return
                }
                if (
                  platformRecommendation?.takeover_mode === "suggest" &&
                  repairAssignedWorker !== "none" &&
                  repairAssignedWorker !== platformRecommendation.recommended_worker_id &&
                  !repairRejectedCategory
                ) {
                  alert("选择与平台推荐不同的工人时，必须选择拒绝原因分类")
                  return
                }
                const amount = repairUpdateStatus === "completed" ? parseFloat(repairUpdateAmount) : undefined
                const assignedTo = repairAssignedWorker === "none" ? undefined : repairAssignedWorker
                const rejectedReason =
                  platformRecommendation &&
                  repairAssignedWorker !== platformRecommendation.recommended_worker_id
                    ? repairRejectedReason
                    : undefined
                const rejectedCategory =
                  platformRecommendation &&
                  repairAssignedWorker !== platformRecommendation.recommended_worker_id
                    ? repairRejectedCategory
                    : undefined
                if (selectedRepair) {
                  onUpdateRepairStatus(
                    selectedRepair.id,
                    repairUpdateStatus,
                    amount,
                    assignedTo,
                    rejectedReason,
                    rejectedCategory
                  )
                }
              }}
              disabled={isUpdatingRepair || !repairUpdateStatus || !selectedRepair}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isUpdatingRepair ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                "更新状态"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
