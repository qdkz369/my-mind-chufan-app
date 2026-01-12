"use client"

import { Package, Truck, CheckCircle2, Clock, XCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const allOrders = [
  {
    id: "ORD-20250119-001",
    service: "天然气配送",
    status: "配送中",
    statusColor: "bg-primary text-primary-foreground",
    icon: Truck,
    time: "2025-01-19 10:30",
    estimatedTime: "预计30分钟送达",
    amount: "¥280",
    details: "50kg液化气 × 1",
  },
  {
    id: "ORD-20250118-089",
    service: "炉灶维修",
    status: "已完成",
    statusColor: "bg-success text-success-foreground",
    icon: CheckCircle2,
    time: "2025-01-18 14:30",
    amount: "¥150",
    details: "更换点火器",
  },
  {
    id: "ORD-20250118-076",
    service: "油烟机清洁",
    status: "待确认",
    statusColor: "bg-warning text-warning-foreground",
    icon: Clock,
    time: "2025-01-18 09:15",
    amount: "¥200",
    details: "深度清洁服务",
  },
  {
    id: "ORD-20250117-045",
    service: "冷柜租赁",
    status: "进行中",
    statusColor: "bg-primary text-primary-foreground",
    icon: Package,
    time: "2025-01-17 16:00",
    amount: "¥500/月",
    details: "双门冷柜 · 租期12个月",
  },
  {
    id: "ORD-20250116-032",
    service: "设备分期",
    status: "已取消",
    statusColor: "bg-destructive text-destructive-foreground",
    icon: XCircle,
    time: "2025-01-16 11:20",
    amount: "¥0",
    details: "用户取消订单",
  },
]

export function OrderList() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 text-foreground">我的订单</h1>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6 theme-card bg-muted/50">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">全部</TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">待处理</TabsTrigger>
          <TabsTrigger value="ongoing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">进行中</TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">已完成</TabsTrigger>
          <TabsTrigger value="cancelled" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">已取消</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {allOrders.map((order) => (
            <Card key={order.id} className="theme-card p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-muted/50 theme-card flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-button)' }}>
                  <order.icon className="h-6 w-6 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">{order.service}</h3>
                    <Badge className={`text-xs ${order.statusColor}`}>{order.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{order.details}</p>
                  <p className="text-xs text-muted-foreground mb-1">订单号: {order.id}</p>
                  <p className="text-xs text-muted-foreground">{order.time}</p>
                  {order.estimatedTime && (
                    <p className="text-xs text-primary font-medium mt-1">{order.estimatedTime}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-lg mb-2 text-foreground">{order.amount}</div>
                  <Button size="sm" variant="outline" className="theme-button">
                    查看详情
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending">
          <div className="text-center py-12 text-muted-foreground">暂无待处理订单</div>
        </TabsContent>

        <TabsContent value="ongoing">
          <div className="text-center py-12 text-muted-foreground">暂无进行中订单</div>
        </TabsContent>

        <TabsContent value="completed">
          <div className="text-center py-12 text-muted-foreground">暂无已完成订单</div>
        </TabsContent>

        <TabsContent value="cancelled">
          <div className="text-center py-12 text-muted-foreground">暂无已取消订单</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
