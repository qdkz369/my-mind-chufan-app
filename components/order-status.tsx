"use client"

import { Truck, CheckCircle2, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const orders = [
  {
    id: "ORD-20250119-001",
    service: "天然气配送",
    status: "配送中",
    statusColor: "bg-primary text-primary-foreground",
    icon: Truck,
    time: "预计30分钟送达",
    amount: "¥280",
  },
  {
    id: "ORD-20250118-089",
    service: "炉灶维修",
    status: "已完成",
    statusColor: "bg-success text-success-foreground",
    icon: CheckCircle2,
    time: "今天 14:30",
    amount: "¥150",
  },
  {
    id: "ORD-20250118-076",
    service: "油烟机清洁",
    status: "待确认",
    statusColor: "bg-warning text-warning-foreground",
    icon: Clock,
    time: "等待商家接单",
    amount: "¥200",
  },
]

export function OrderStatus() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-base">最近订单</h2>
        <button className="text-sm text-muted-foreground hover:text-foreground">查看全部</button>
      </div>
      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <order.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-sm">{order.service}</h3>
                <Badge className={`text-xs ${order.statusColor}`}>{order.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{order.id}</p>
              <p className="text-xs text-muted-foreground">{order.time}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-semibold text-sm">{order.amount}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
