"use client"

// 订单管理 + 配送订单详情对话框
// 封装 selectedDeliveryOrder、isDeliveryOrderDetailOpen 及 Dialog，点击维修订单时通过 onNavigateToRepairs 跳转报修

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { OrdersManagement } from "./orders-management"
import type { Order } from "../types/dashboard-types"

export interface OrdersWithDialogsProps {
  orders: Order[]
  isLoadingOrders: boolean
  orderServiceTypeFilter: string
  onOrderServiceTypeFilterChange: (value: string) => void
  orderStatusFilter: string
  onOrderStatusFilterChange: (value: string) => void
  /** 点击维修订单时调用，由父组件切换菜单并跳转报修（带 ?id=） */
  onNavigateToRepairs: (order: Order) => void
}

export function OrdersWithDialogs({
  orders,
  isLoadingOrders,
  orderServiceTypeFilter,
  onOrderServiceTypeFilterChange,
  orderStatusFilter,
  onOrderStatusFilterChange,
  onNavigateToRepairs,
}: OrdersWithDialogsProps) {
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState<Order | null>(null)
  const [isDeliveryOrderDetailOpen, setIsDeliveryOrderDetailOpen] = useState(false)

  const handleOrderClick = (order: Order) => {
    const isRepairOrder =
      order.service_type?.includes("维修") ||
      order.service_type === "维修服务" ||
      String(order.service_type || "").toLowerCase().includes("repair")
    if (isRepairOrder) {
      onNavigateToRepairs(order)
    } else {
      setSelectedDeliveryOrder(order)
      setIsDeliveryOrderDetailOpen(true)
    }
  }

  return (
    <>
      <OrdersManagement
        orders={orders}
        isLoadingOrders={isLoadingOrders}
        orderServiceTypeFilter={orderServiceTypeFilter}
        onOrderServiceTypeFilterChange={onOrderServiceTypeFilterChange}
        orderStatusFilter={orderStatusFilter}
        onOrderStatusFilterChange={onOrderStatusFilterChange}
        onOrderClick={handleOrderClick}
      />
      <Dialog open={isDeliveryOrderDetailOpen} onOpenChange={setIsDeliveryOrderDetailOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">燃料配送订单详情</DialogTitle>
          </DialogHeader>
          {selectedDeliveryOrder && (
            <div className="space-y-4">
              <div>
                <span className="text-slate-400 text-sm">餐厅：</span>
                <span className="text-white ml-2">{selectedDeliveryOrder.restaurant_name || selectedDeliveryOrder.restaurant_id}</span>
              </div>
              <div>
                <span className="text-slate-400 text-sm">订单号：</span>
                <span className="text-white font-mono text-sm ml-2">{selectedDeliveryOrder.id.slice(0, 8)}...</span>
              </div>
              <div>
                <span className="text-slate-400 text-sm">状态：</span>
                <span className="text-white ml-2">
                  {selectedDeliveryOrder.status === "pending" || selectedDeliveryOrder.status === "待处理"
                    ? "待处理"
                    : selectedDeliveryOrder.status === "delivering" || selectedDeliveryOrder.status === "配送中" || selectedDeliveryOrder.status === "进行中"
                      ? "进行中"
                      : selectedDeliveryOrder.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-sm">金额：</span>
                <span className="text-white ml-2">¥{selectedDeliveryOrder.amount?.toFixed(2) ?? "0.00"}</span>
              </div>
              {(selectedDeliveryOrder.worker_id || (selectedDeliveryOrder as Order & { assigned_to?: string }).assigned_to) && (
                <div>
                  <span className="text-slate-400 text-sm">已指派工人</span>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsDeliveryOrderDetailOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800">
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
