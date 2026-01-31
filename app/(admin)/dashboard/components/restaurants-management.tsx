"use client"

// 餐厅管理组件
// 从 page.tsx 的 renderRestaurants() 函数提取

import {
  Building2,
  Users,
  Phone,
  MapPin,
  Eye,
  Truck,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Restaurant } from "../types/dashboard-types"

interface RestaurantsManagementProps {
  restaurants: Restaurant[]
  viewMode: "list" | "map"
  onViewModeChange: (mode: "list" | "map") => void
  onLocateRestaurant: (restaurant: Restaurant) => void
  onViewDetails: (restaurant: Restaurant) => void
  onOpenAssignDialog: (restaurant: Restaurant) => void
}

function shouldShowWarning(totalRefilled: number): boolean {
  return totalRefilled < 50
}

function getRefilledPercentage(totalRefilled: number): number {
  return Math.min(100, (totalRefilled / 100) * 100)
}

export function RestaurantsManagement({
  restaurants,
  viewMode,
  onViewModeChange,
  onLocateRestaurant,
  onViewDetails,
  onOpenAssignDialog,
}: RestaurantsManagementProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">餐厅管理</h1>
          <p className="text-slate-400">管理所有已注册餐厅的信息和状态</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onViewModeChange(viewMode === "list" ? "map" : "list")}
            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
          >
            {viewMode === "list" ? <MapPin className="h-4 w-4 mr-2" /> : <Users className="h-4 w-4 mr-2" />}
            {viewMode === "list" ? "地图视图" : "列表视图"}
          </Button>
        </div>
      </div>

      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
        <CardContent className="p-6">
          {viewMode === "map" ? (
            <div className="h-[300px] md:h-[600px] rounded-lg overflow-hidden border border-slate-800">
              {restaurants.filter((r) => r.latitude && r.longitude).length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">暂无餐厅位置信息</p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">餐厅名称</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">负责人</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">联系电话</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">累计加注量</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">状态</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map((restaurant) => {
                    const showWarning = shouldShowWarning(restaurant.total_refilled)
                    const refilledPercentage = getRefilledPercentage(restaurant.total_refilled)
                    return (
                      <tr
                        key={restaurant.id}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="text-white font-medium">{restaurant.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300">{restaurant.contact_name || "未设置"}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300">{restaurant.contact_phone || "未设置"}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-[120px]">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-white font-medium">
                                  {restaurant.total_refilled.toFixed(1)} kg
                                </span>
                                {showWarning && (
                                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    预警
                                  </Badge>
                                )}
                              </div>
                              <Progress
                                value={refilledPercentage}
                                className={`h-2 ${showWarning ? "bg-red-500/20" : "bg-slate-800"}`}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            className={
                              restaurant.status === "activated"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            }
                          >
                            {restaurant.status === "activated" ? "已激活" : "待激活"}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onLocateRestaurant(restaurant)}
                              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                              disabled={!restaurant.latitude || !restaurant.longitude}
                              title={!restaurant.latitude || !restaurant.longitude ? "该餐厅没有位置信息" : "在地图上定位该餐厅"}
                            >
                              <MapPin className="h-4 w-4 mr-1" />
                              定位
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewDetails(restaurant)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              查看详情
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onOpenAssignDialog(restaurant)}
                              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              指派配送
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
