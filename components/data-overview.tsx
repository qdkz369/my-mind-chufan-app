"use client"

import { TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"

const stats = [
  { icon: Clock, label: "待处理", value: "5", color: "text-warning", bgColor: "bg-warning/10" },
  { icon: TrendingUp, label: "进行中", value: "12", color: "text-primary", bgColor: "bg-primary/10" },
  { icon: CheckCircle2, label: "已完成", value: "87", color: "text-success", bgColor: "bg-success/10" },
  { icon: AlertCircle, label: "需关注", value: "2", color: "text-destructive", bgColor: "bg-destructive/10" },
]

export function DataOverview() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} semanticLevel="primary_fact" className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </div>
          <div className="text-2xl font-bold mb-1">{stat.value}</div>
          <div className="text-sm text-muted-foreground">{stat.label}</div>
        </Card>
      ))}
    </div>
  )
}
