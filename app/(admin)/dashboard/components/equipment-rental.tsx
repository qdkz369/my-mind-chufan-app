// 从 page.tsx 的 renderEquipmentRental() 主内容区提取（不含对话框）
// 设备租赁管理：设备租赁基础功能 + 设备租赁订单管理列表

import { Package, Search, Plus, Upload, AlertCircle, CheckCircle2, Eye } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

export function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    case "confirmed":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    case "active":
      return "bg-green-500/20 text-green-400 border-green-500/30"
    case "completed":
      return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    case "cancelled":
      return "bg-red-500/20 text-red-400 border-red-500/30"
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "待确认"
    case "confirmed":
      return "已确认"
    case "active":
      return "租赁中"
    case "completed":
      return "已完成"
    case "cancelled":
      return "已取消"
    default:
      return status
  }
}

export function getPaymentStatusColor(status: string) {
  switch (status) {
    case "paid":
      return "bg-green-500/20 text-green-400 border-green-500/30"
    case "partial":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    case "pending":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30"
    case "refunded":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }
}

export function getPaymentStatusLabel(status: string) {
  switch (status) {
    case "paid":
      return "已支付"
    case "partial":
      return "部分支付"
    case "pending":
      return "待支付"
    case "refunded":
      return "已退款"
    default:
      return status
  }
}

export interface EquipmentRentalPanelProps {
  // 设备租赁基础（device_rentals）
  deviceRentals: any[]
  deviceRentalError: string | null
  isLoadingDeviceRentals: boolean
  deviceRentalStatusFilter: string
  deviceRentalSearchQuery: string
  onDeviceRentalStatusFilterChange: (v: string) => void
  onDeviceRentalSearchQueryChange: (v: string) => void
  onOpenAddDeviceRental: () => void
  onOpenUploadEquipment: () => void
  onSelectDeviceRental: (rental: any) => void
  onRetryDeviceRentals: () => void
  // 租赁订单（rental_orders）
  rentalOrders: any[]
  rentalOrderError: string | null
  isLoadingRentalOrders: boolean
  rentalOrderStatusFilter: string
  rentalOrderSearchQuery: string
  selectedRentalOrderIds: string[]
  onRentalOrderStatusFilterChange: (v: string) => void
  onRentalOrderSearchQueryChange: (v: string) => void
  onToggleRentalOrderSelection: (orderId: string, checked: boolean) => void
  onOpenAddRentalOrder: () => void
  onBatchUpdateStatus: () => void
  onClearRentalOrderSelection: () => void
  onSelectRentalOrder: (order: any) => void
  onRetryRentalOrders: () => void
}

export function EquipmentRentalPanel({
  deviceRentals,
  deviceRentalError,
  isLoadingDeviceRentals,
  deviceRentalStatusFilter,
  deviceRentalSearchQuery,
  onDeviceRentalStatusFilterChange,
  onDeviceRentalSearchQueryChange,
  onOpenAddDeviceRental,
  onOpenUploadEquipment,
  onSelectDeviceRental,
  onRetryDeviceRentals,
  rentalOrders,
  rentalOrderError,
  isLoadingRentalOrders,
  rentalOrderStatusFilter,
  rentalOrderSearchQuery,
  selectedRentalOrderIds,
  onRentalOrderStatusFilterChange,
  onRentalOrderSearchQueryChange,
  onToggleRentalOrderSelection,
  onOpenAddRentalOrder,
  onBatchUpdateStatus,
  onClearRentalOrderSelection,
  onSelectRentalOrder,
  onRetryRentalOrders,
}: EquipmentRentalPanelProps) {
  const pendingOrders = rentalOrders.filter((o) => o.order_status === "pending")
  const activeOrders = rentalOrders.filter((o) => o.order_status === "active")
  const completedOrders = rentalOrders.filter((o) => o.order_status === "completed")
  const cancelledOrders = rentalOrders.filter((o) => o.order_status === "cancelled")

  const filteredOrders = rentalOrders.filter((order) => {
    if (rentalOrderStatusFilter !== "all" && order.order_status !== rentalOrderStatusFilter) return false
    if (rentalOrderSearchQuery) {
      const q = rentalOrderSearchQuery.toLowerCase()
      return (
        order.order_number?.toLowerCase().includes(q) ||
        order.equipment?.name?.toLowerCase().includes(q) ||
        order.restaurants?.name?.toLowerCase().includes(q) ||
        order.contact_phone?.includes(q)
      )
    }
    return true
  })

  const filteredDeviceRentals = deviceRentals.filter((rental) => {
    if (deviceRentalStatusFilter !== "all" && rental.status !== deviceRentalStatusFilter) return false
    if (deviceRentalSearchQuery) {
      const q = deviceRentalSearchQuery.toLowerCase()
      return (
        rental.device_id?.toLowerCase().includes(q) ||
        rental.devices?.device_id?.toLowerCase().includes(q) ||
        rental.devices?.model?.toLowerCase().includes(q) ||
        rental.restaurants?.name?.toLowerCase().includes(q) ||
        rental.restaurants?.address?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const activeDeviceRentals = deviceRentals.filter((r) => r.status === "active")
  const endedDeviceRentals = deviceRentals.filter((r) => r.status === "ended")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">设备租赁管理</h1>
        <p className="text-slate-400">管理所有设备租赁订单</p>
      </div>

      {/* 设备租赁基础功能区域 */}
      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-green-950/90 border-green-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <Package className="h-5 w-5" />
            设备租赁基础功能
          </CardTitle>
          <CardDescription className="text-slate-400">
            管理设备的使用租赁关系（不涉及租金计算和金融逻辑）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card semanticLevel="secondary_fact" className="bg-slate-800/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-400">总租赁记录</CardDescription>
                <CardTitle className="text-2xl text-white">{deviceRentals.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card semanticLevel="secondary_fact" className="bg-green-800/50 border-green-700/50">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-400">租赁中</CardDescription>
                <CardTitle className="text-2xl text-green-400">{activeDeviceRentals.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card semanticLevel="secondary_fact" className="bg-slate-700/50 border-slate-600/50">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-400">已结束</CardDescription>
                <CardTitle className="text-2xl text-slate-400">{endedDeviceRentals.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="搜索设备ID、设备型号、餐厅名称或地址..."
                  value={deviceRentalSearchQuery}
                  onChange={(e) => onDeviceRentalSearchQueryChange(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={onOpenAddDeviceRental} className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                创建租赁记录
              </Button>
              <Button type="button" onClick={onOpenUploadEquipment} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Upload className="h-4 w-4 mr-2" />
                上传设备
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {["all", "active", "ended"].map((status) => (
              <Button
                key={status}
                variant={deviceRentalStatusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => onDeviceRentalStatusFilterChange(status)}
                className={
                  deviceRentalStatusFilter === status
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "border-slate-600/50 text-slate-300 hover:bg-slate-800/50"
                }
              >
                {status === "all" ? "全部" : status === "active" ? "租赁中" : "已结束"}
              </Button>
            ))}
          </div>

          {deviceRentalError && (
            <Card semanticLevel="secondary_fact" className="bg-red-900/50 border-red-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="flex-1">
                    <p className="text-red-400 font-medium">加载失败</p>
                    <p className="text-red-300 text-sm mt-1">{deviceRentalError}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={onRetryDeviceRentals} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                    重试
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoadingDeviceRentals ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-green-400 mr-2" />
              <span className="text-slate-400">加载中...</span>
            </div>
          ) : filteredDeviceRentals.length === 0 ? (
            <Card semanticLevel="secondary_fact" className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">{deviceRentalError ? "加载失败，请点击上方重试按钮" : "暂无设备租赁记录"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDeviceRentals.map((rental) => (
                <Card
                  key={rental.id}
                  semanticLevel="secondary_fact"
                  className="bg-slate-800/50 border-slate-700/50 hover:border-green-500/50 transition-all cursor-pointer"
                  onClick={() => onSelectDeviceRental(rental)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-white">{rental.devices?.device_id || rental.device_id}</h3>
                          <Badge
                            className={
                              rental.status === "active"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            }
                          >
                            {rental.status === "active" ? "租赁中" : "已结束"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">设备型号：</span>
                            <span className="text-white ml-2">{rental.devices?.model || "未知"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">餐厅：</span>
                            <span className="text-white ml-2">{rental.restaurants?.name || "未知"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">开始时间：</span>
                            <span className="text-white ml-2">{new Date(rental.start_at).toLocaleString("zh-CN")}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">结束时间：</span>
                            <span className="text-white ml-2">
                              {rental.end_at ? new Date(rental.end_at).toLocaleString("zh-CN") : "未结束"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="border-t border-slate-700/50 my-6" />
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">设备租赁订单管理</h2>
        <p className="text-slate-400 mb-6">管理复杂的设备租赁订单（包含租金、支付等）</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">总订单数</CardDescription>
            <CardTitle className="text-3xl text-white">{rentalOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-yellow-950/90 border-yellow-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">待确认</CardDescription>
            <CardTitle className="text-3xl text-yellow-400">{pendingOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">租赁中</CardDescription>
            <CardTitle className="text-3xl text-blue-400">{activeOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-green-950/90 border-green-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">已完成</CardDescription>
            <CardTitle className="text-3xl text-green-400">{completedOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-red-950/90 border-red-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">已取消</CardDescription>
            <CardTitle className="text-3xl text-red-400">{cancelledOrders.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="搜索订单号、设备名称、餐厅名称或联系电话..."
                  value={rentalOrderSearchQuery}
                  onChange={(e) => onRentalOrderSearchQueryChange(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={onOpenAddRentalOrder} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                新增订单
              </Button>
              {selectedRentalOrderIds.length > 0 && (
                <>
                  <Button onClick={onBatchUpdateStatus} variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    批量确认 ({selectedRentalOrderIds.length})
                  </Button>
                  <Button onClick={onClearRentalOrderSelection} variant="outline" className="border-slate-600/50 text-slate-400 hover:bg-slate-800/50">
                    取消选择
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2.5">
            {["all", "pending", "confirmed", "active", "completed", "cancelled"].map((status) => (
              <Button
                key={status}
                variant={rentalOrderStatusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => onRentalOrderStatusFilterChange(status)}
                className={
                  rentalOrderStatusFilter === status
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/30 border-0 px-4 h-9 font-medium transition-all"
                    : "border-slate-600/50 text-slate-300 hover:bg-slate-800/50 hover:border-slate-500 hover:text-white px-4 h-9 font-medium transition-all"
                }
              >
                {status === "all" ? "全部" : getStatusLabel(status)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {rentalOrderError && (
        <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-red-900/90 to-red-800/90 border-red-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-400 font-medium">加载失败</p>
                <p className="text-red-300 text-sm mt-1">{rentalOrderError}</p>
              </div>
              <Button size="sm" variant="outline" onClick={onRetryRentalOrders} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoadingRentalOrders ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
          <span className="text-slate-400">加载中...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">{rentalOrderError ? "加载失败，请点击上方重试按钮" : "暂无租赁订单"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const orderId = order.id || order.order_number
            if (!orderId) return null
            const isSelected = selectedRentalOrderIds.includes(order.id)
            return (
              <Card
                key={orderId}
                semanticLevel="secondary_fact"
                className={`bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm hover:border-blue-500/50 transition-all ${
                  isSelected ? "border-blue-500 ring-2 ring-blue-500/50" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation()
                          onToggleRentalOrderSelection(order.id, e.target.checked)
                        }}
                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 cursor-pointer" onClick={() => onSelectRentalOrder(order)}>
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-bold text-white">{order.equipment?.name || "未知设备"}</h3>
                        <Badge className={getStatusColor(order.order_status)}>{getStatusLabel(order.order_status)}</Badge>
                        <Badge className={getPaymentStatusColor(order.payment_status)}>
                          {getPaymentStatusLabel(order.payment_status)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">订单号：</span>
                          <span className="text-white">{order.order_number}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">餐厅：</span>
                          <span className="text-white">{order.restaurants?.name || "未知"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">数量：</span>
                          <span className="text-white">{order.quantity} 台</span>
                        </div>
                        <div>
                          <span className="text-slate-400">租期：</span>
                          <span className="text-white">{order.rental_period} 个月</span>
                        </div>
                        <div>
                          <span className="text-slate-400">开始日期：</span>
                          <span className="text-white">{order.start_date}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">结束日期：</span>
                          <span className="text-white">{order.end_date || "未设置"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">总金额：</span>
                          <span className="text-blue-400 font-bold">¥{order.total_amount?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">押金：</span>
                          <span className="text-white">¥{order.deposit_amount?.toFixed(2) || "0.00"}</span>
                        </div>
                      </div>
                    </div>
                    <Eye className="h-5 w-5 text-slate-400 ml-4" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
