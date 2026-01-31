// 餐厅管理：面板 + 餐厅详情对话框 + 指派配送对话框（从 page 提取）

"use client"

import { useState, useCallback } from "react"
import { MapPin, User, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import { RestaurantsManagement } from "./restaurants-management"
import type { Restaurant, Worker } from "../types/dashboard-types"

export interface RestaurantsWithDialogsProps {
  restaurants: Restaurant[]
  workers: Worker[]
  onLocateRestaurant: (restaurant: Restaurant) => void
  onAssignSuccess?: () => void | Promise<void>
}

export function RestaurantsWithDialogs({
  restaurants,
  workers,
  onLocateRestaurant,
  onAssignSuccess,
}: RestaurantsWithDialogsProps) {
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState("")
  const [isAssigning, setIsAssigning] = useState(false)

  const handleViewDetails = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setIsDetailDialogOpen(true)
  }, [])

  const handleOpenAssignDialog = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setIsAssignDialogOpen(true)
  }, [])

  const handleAssignDelivery = useCallback(async () => {
    if (!selectedRestaurant || !selectedWorkerId) {
      alert("请选择餐厅和工人")
      return
    }
    setIsAssigning(true)
    try {
      const response = await fetchWithAuth("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: selectedRestaurant.id,
          worker_id: selectedWorkerId,
          service_type: "燃料配送",
          status: "pending",
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "指派失败")
      alert("指派成功")
      setIsAssignDialogOpen(false)
      setSelectedWorkerId("")
      if (typeof onAssignSuccess === "function") await onAssignSuccess()
    } catch (e: unknown) {
      alert((e instanceof Error ? e.message : null) || "指派失败")
    } finally {
      setIsAssigning(false)
    }
  }, [selectedRestaurant, selectedWorkerId, onAssignSuccess])

  return (
    <>
      <RestaurantsManagement
        restaurants={restaurants}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onLocateRestaurant={onLocateRestaurant}
        onViewDetails={handleViewDetails}
        onOpenAssignDialog={handleOpenAssignDialog}
      />

      {/* 餐厅详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">餐厅详情</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedRestaurant?.name} 的详细信息
            </DialogDescription>
          </DialogHeader>
          {selectedRestaurant && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-1">餐厅名称</div>
                  <div className="text-white font-medium">{selectedRestaurant.name}</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-1">状态</div>
                  <Badge
                    className={
                      selectedRestaurant.status === "activated"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    }
                  >
                    {selectedRestaurant.status === "activated" ? "已激活" : "待激活"}
                  </Badge>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-1">负责人</div>
                  <div className="text-white">{selectedRestaurant.contact_name || "未设置"}</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-1">联系电话</div>
                  <div className="text-white">{selectedRestaurant.contact_phone || "未设置"}</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg col-span-2">
                  <div className="text-sm text-slate-400 mb-1">累计加注量</div>
                  <div className="text-white font-semibold text-xl">
                    {selectedRestaurant.total_refilled.toFixed(1)} kg
                  </div>
                </div>
                {selectedRestaurant.address && (
                  <div className="p-4 bg-slate-800/50 rounded-lg col-span-2">
                    <div className="text-sm text-slate-400 mb-1">地址</div>
                    <div className="text-white flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedRestaurant.address}
                    </div>
                  </div>
                )}
                {selectedRestaurant.qr_token && (
                  <div className="p-4 bg-slate-800/50 rounded-lg col-span-2">
                    <div className="text-sm text-slate-400 mb-1">QR Token</div>
                    <div className="text-white font-mono text-sm">{selectedRestaurant.qr_token}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 指派配送对话框 */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">指派配送</DialogTitle>
            <DialogDescription className="text-slate-400">
              为 {selectedRestaurant?.name} 指派配送工人
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium text-slate-300 mb-2 block">选择工人</Label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="请选择工人" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {workers.map((worker) => (
                    <SelectItem
                      key={worker.id}
                      value={worker.id}
                      className="text-white hover:bg-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{worker.name}</span>
                        {worker.phone && (
                          <span className="text-slate-400 text-xs">({worker.phone})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-2">餐厅信息</div>
              <div className="text-white font-medium">{selectedRestaurant?.name}</div>
              {selectedRestaurant?.contact_name && (
                <div className="text-slate-300 text-sm mt-1">负责人: {selectedRestaurant.contact_name}</div>
              )}
              {selectedRestaurant?.contact_phone && (
                <div className="text-slate-300 text-sm mt-1">电话: {selectedRestaurant.contact_phone}</div>
              )}
              {selectedRestaurant?.address && (
                <div className="text-slate-300 text-sm mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedRestaurant.address}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={() => setIsAssignDialogOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                取消
              </Button>
              <Button
                onClick={handleAssignDelivery}
                disabled={!selectedWorkerId || isAssigning}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              >
                {isAssigning ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    创建中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    创建订单
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
