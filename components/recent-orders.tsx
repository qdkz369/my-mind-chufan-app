"use client"

import { Clock, CheckCircle2, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const orders = [
  {
    id: "ORD20250119001",
    type: "燃料配送",
    status: "进行中",
    time: "预计 15:30 送达",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  {
    id: "ORD20250118005",
    type: "设备租赁",
    status: "已完成",
    time: "今天 10:20",
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  {
    id: "ORD20250117012",
    type: "维修服务",
    status: "已完成",
    time: "昨天 14:45",
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
]

export function RecentOrders() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">最近订单</h2>
        <Link href="/orders">
          <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
            全部订单
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {orders.map((order) => (
          <Card
            key={order.id}
            semanticLevel="action"
            className="theme-card backdrop-blur-sm p-4 hover:opacity-90 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-10 h-10 ${order.bgColor} rounded-lg flex items-center justify-center`}>
                  <order.icon className={`h-5 w-5 ${order.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground">{order.type}</h4>
                    <Badge className={`${order.bgColor} ${order.color} border ${order.borderColor} text-xs`}>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{order.id}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{order.time}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
