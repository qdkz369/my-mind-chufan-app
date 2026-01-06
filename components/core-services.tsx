"use client"

import { Truck, Wrench, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const services = [
  {
    icon: Truck,
    title: "燃料配送",
    description: "智能监控 · 自动补给 · 24小时送达",
    color: "from-orange-500 to-red-600",
    shadowColor: "shadow-orange-500/30",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-400",
    stats: [
      { label: "今日配送", value: "28单" },
      { label: "准时率", value: "99.2%" },
    ],
    href: "/payment?service=燃料配送",
  },
  {
    icon: Wrench,
    title: "设备租赁",
    description: "灵活租期 · 免费维护 · 随时升级",
    color: "from-blue-500 to-cyan-600",
    shadowColor: "shadow-blue-500/30",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    stats: [
      { label: "可租设备", value: "156台" },
      { label: "满意度", value: "98%" },
    ],
    href: "/equipment-rental",
  },
]

export function CoreServices() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">核心服务</h2>
        <Link href="/services">
          <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
            全部服务
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card
            key={service.title}
            className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-6 hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className={`w-12 h-12 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center shadow-lg ${service.shadowColor}`}
              >
                <service.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{service.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{service.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {service.stats.map((stat) => (
                <div key={stat.label} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">{stat.label}</div>
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                </div>
              ))}
            </div>

            <Link href={service.href || "/services"}>
              <Button className={`w-full bg-gradient-to-r ${service.color} hover:opacity-90 text-white`}>
                立即下单
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}
