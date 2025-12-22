"use client"

import { Truck, Wrench, Package, Droplet, ShoppingCart, HardHat } from "lucide-react"
import { Card } from "@/components/ui/card"
import Link from "next/link"

const actions = [
  {
    icon: Truck,
    label: "燃料配送",
    color: "from-orange-500 to-red-600",
    shadowColor: "shadow-orange-500/20",
    href: "/services",
  },
  {
    icon: Package,
    label: "设备租赁",
    color: "from-blue-500 to-cyan-600",
    shadowColor: "shadow-blue-500/20",
    href: "/services",
  },
  {
    icon: ShoppingCart,
    label: "B2B商城",
    color: "from-indigo-500 to-purple-600",
    shadowColor: "shadow-indigo-500/20",
    href: "/mall",
  },
  {
    icon: Wrench,
    label: "维修服务",
    color: "from-green-500 to-emerald-600",
    shadowColor: "shadow-green-500/20",
    href: "/services",
  },
  {
    icon: Droplet,
    label: "清洁服务",
    color: "from-cyan-500 to-teal-600",
    shadowColor: "shadow-cyan-500/20",
    href: "/services",
  },
  {
    icon: HardHat,
    label: "工程改造",
    color: "from-purple-500 to-pink-600",
    shadowColor: "shadow-purple-500/20",
    href: "/services",
  },
]

export function QuickActions() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">快速服务</h2>
      <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm p-4">
        <div className="grid grid-cols-3 gap-4">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-slate-800/50 transition-all hover:scale-105"
            >
              <div
                className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center shadow-lg ${action.shadowColor}`}
              >
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-center text-slate-200">{action.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
