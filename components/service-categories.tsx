"use client"

import { ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const categories = [
  {
    title: "燃料配送",
    subtitle: "天然气 · 液化气 · 柴油",
    tag: "2小时达",
    tagColor: "bg-secondary text-secondary-foreground",
  },
  {
    title: "设备租赁",
    subtitle: "炉灶 · 冷柜 · 油烟机",
    tag: "按月计费",
    tagColor: "bg-primary text-primary-foreground",
  },
  {
    title: "维修保养",
    subtitle: "水电维修 · 设备保养",
    tag: "快速响应",
    tagColor: "bg-success text-success-foreground",
  },
  {
    title: "供应链金融",
    subtitle: "账期延长 · 设备分期",
    tag: "低利率",
    tagColor: "bg-warning text-warning-foreground",
  },
]

export function ServiceCategories() {
  return (
    <Card semanticLevel="action" className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-base">服务分类</h2>
        <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          全部
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        {categories.map((category) => (
          <button
            key={category.title}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{category.title}</h3>
                <Badge variant="secondary" className={`text-xs ${category.tagColor}`}>
                  {category.tag}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{category.subtitle}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </div>
    </Card>
  )
}
