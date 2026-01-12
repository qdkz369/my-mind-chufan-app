"use client"

import { Truck, Package, Wrench, Droplet, HardHat, Store, CreditCard, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const services = [
  {
    icon: Truck,
    title: "燃料配送",
    description: "天然气、液化气、柴油配送服务",
    price: "¥280起",
    tag: "2小时达",
    phase: "前期",
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
  },
  {
    icon: Package,
    title: "设备租赁",
    description: "炉灶、冷柜、油烟机等设备租赁",
    price: "¥500/月起",
    tag: "灵活租期",
    phase: "前期",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    icon: Store,
    title: "厨房用品",
    description: "锅具、刀具、餐具等厨房用品采购",
    price: "在线商城",
    tag: "次日达",
    phase: "中期",
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
  },
  {
    icon: Wrench,
    title: "维修服务",
    description: "水电维修、设备保养、故障排查",
    price: "¥100起",
    tag: "快速响应",
    phase: "中期",
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
  },
  {
    icon: Droplet,
    title: "清洁服务",
    description: "油烟机清洗、厨房深度清洁",
    price: "¥200起",
    tag: "专业团队",
    phase: "中期",
    iconColor: "text-cyan-600",
    iconBg: "bg-cyan-50",
  },
  {
    icon: HardHat,
    title: "工程改造",
    description: "厨房布局优化、设备升级改造",
    price: "定制方案",
    tag: "一站式",
    phase: "中期",
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
  },
  {
    icon: Zap,
    title: "B2B商城",
    description: "食材采购、调料批发、一站式采购平台",
    price: "在线下单",
    tag: "批发价",
    phase: "后期",
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    link: "/mall",
  },
  {
    icon: CreditCard,
    title: "金融服务",
    description: "账期延长、设备分期、经营贷款",
    price: "低息贷款",
    tag: "灵活还款",
    phase: "后期",
    iconColor: "text-yellow-600",
    iconBg: "bg-yellow-50",
  },
]

export function ServiceList() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-foreground">全部服务</h1>
        <p className="text-sm text-muted-foreground">专业餐饮后市场一站式解决方案</p>
      </div>

      <div className="space-y-6">
        {["前期", "中期", "后期"].map((phase) => (
          <div key={phase}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-foreground">
              <span>{phase}服务</span>
              <Badge variant="secondary" className="text-xs bg-muted/50 text-muted-foreground border-border/50">
                {services.filter((s) => s.phase === phase).length}项
              </Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services
                .filter((service) => service.phase === phase)
                .map((service) => (
                  <Card key={service.title} className="p-4 theme-card hover:border-primary/50 transition-all">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-12 h-12 ${service.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}
                      >
                        <service.icon className={`h-6 w-6 ${service.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{service.title}</h3>
                          <Badge variant="secondary" className="text-xs bg-muted/50 text-muted-foreground border-border/50">
                            {service.tag}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-primary font-semibold">{service.price}</span>
                          {service.link ? (
                            <Link href={service.link}>
                              <Button size="sm">进入商城</Button>
                            </Link>
                          ) : service.title === "燃料配送" ? (
                            <Link href="/payment?service=燃料配送">
                              <Button size="sm">立即购买</Button>
                            </Link>
                          ) : (
                            <Button size="sm">立即预约</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
