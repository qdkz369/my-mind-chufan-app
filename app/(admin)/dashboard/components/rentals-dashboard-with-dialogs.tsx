// 租赁工作台：面板 + 新增租赁对话框 + 租赁详情对话框（从 page.tsx renderRentals 提取）

"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import { logBusinessWarning } from "@/lib/utils/logger"
import {
  RentalsDashboardPanel,
  getStatusColor as getRentalStatusColor,
  getStatusLabel as getRentalStatusLabel,
} from "./rentals-dashboard"

const initialNewRental = {
  customer_name: "",
  customer_phone: "",
  devices: [{ device_name: "", device_sn: "" }] as { device_name: string; device_sn: string }[],
  rent_amount: "",
  deposit: "",
  start_date: "",
  end_date: "",
  status: "pending_delivery" as const,
  notes: "",
  restaurant_id: "",
  source: "admin_create" as "admin_create" | "client_apply",
}

export function RentalsDashboardWithDialogs() {
  const [rentals, setRentals] = useState<any[]>([])
  const [isLoadingRentals, setIsLoadingRentals] = useState(false)
  const [rentalSourceFilter, setRentalSourceFilter] = useState<"all" | "admin_create" | "client_apply">("all")
  const [newRental, setNewRental] = useState(initialNewRental)
  const [isAddRentalDialogOpen, setIsAddRentalDialogOpen] = useState(false)
  const [isRentalDetailDialogOpen, setIsRentalDetailDialogOpen] = useState(false)
  const [selectedRental, setSelectedRental] = useState<any | null>(null)
  const [activeRentalAgreementId, setActiveRentalAgreementId] = useState<string | null>(null)
  const [availableRestaurants, setAvailableRestaurants] = useState<any[]>([])

  const loadRentals = useCallback(async () => {
    if (!supabase) return
    setIsLoadingRentals(true)
    try {
      let query = supabase.from("rentals").select("*").order("created_at", { ascending: false })
      if (rentalSourceFilter === "admin_create" || rentalSourceFilter === "client_apply") {
        query = query.eq("source", rentalSourceFilter)
      }
      const { data, error } = await query
      if (error) {
        logBusinessWarning("租赁工作台", "加载失败", error)
        setRentals([])
      } else {
        setRentals(data || [])
      }
    } catch (err) {
      logBusinessWarning("租赁工作台", "加载失败", err)
      setRentals([])
    } finally {
      setIsLoadingRentals(false)
    }
  }, [supabase, rentalSourceFilter])

  useEffect(() => {
    loadRentals()
  }, [loadRentals])

  // 详情弹窗展示关联门店名称需要餐厅列表，在挂载时预加载
  useEffect(() => {
    if (!supabase) return
    supabase
      .from("restaurants")
      .select("id, name, address")
      .order("name")
      .then(({ data, error }) => {
        if (!error) setAvailableRestaurants(data || [])
      })
  }, [supabase])

  const loadRestaurantsAndAgreement = useCallback(async () => {
    if (!supabase) {
      setAvailableRestaurants([])
      return
    }
    try {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id, name, address")
        .order("name")
      if (restaurantError) {
        logBusinessWarning("租赁工作台", "加载餐厅列表失败", restaurantError)
        setAvailableRestaurants([])
      } else {
        setAvailableRestaurants(restaurantData || [])
      }
    } catch (err) {
      logBusinessWarning("租赁工作台", "加载餐厅列表失败", err)
      setAvailableRestaurants([])
    }
    try {
      const res = await fetchWithAuth("/api/agreements?type=rental&active_only=true", { credentials: "include" })
      const json = await res.json()
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setActiveRentalAgreementId(json.data[0].id)
      } else {
        setActiveRentalAgreementId(null)
      }
    } catch {
      setActiveRentalAgreementId(null)
    }
  }, [supabase])

  const handleOpenAddRental = useCallback(async () => {
    await loadRestaurantsAndAgreement()
    setIsAddRentalDialogOpen(true)
  }, [loadRestaurantsAndAgreement])

  const handleSendReminder = useCallback(async (_rental: any) => {
    try {
      alert(`发送催缴短信给 ${_rental.customer_name} (${_rental.customer_phone})`)
    } catch (err) {
      logBusinessWarning("催缴短信", "发送失败", err)
      alert("发送失败，请稍后重试")
    }
  }, [])

  const handleBatchSendReminder = useCallback(async () => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const calculateRemainingDays = (endDate: string | null) => {
      if (!endDate) return null
      const end = new Date(endDate)
      return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }
    const expiredRentals = rentals.filter((r) => {
      if (r.status !== "active") return false
      const days = calculateRemainingDays(r.end_date)
      return days !== null && days <= 7 && days > 0
    })
    if (expiredRentals.length === 0) {
      alert("没有需要催缴的租赁单")
      return
    }
    if (confirm(`确定要向 ${expiredRentals.length} 个客户发送催缴短信吗？`)) {
      alert(`已向 ${expiredRentals.length} 个客户发送催缴短信`)
    }
  }, [rentals])

  const handleTerminateContract = useCallback(
    async (rental: any) => {
      if (!confirm(`确定要终止与 ${rental.customer_name} 的租赁合同吗？`)) return
      try {
        if (!supabase) return
        const { error } = await supabase.from("rentals").update({ status: "returned" }).eq("id", rental.id)
        if (error) throw error
        alert("合同已终止")
        loadRentals()
      } catch (err: any) {
        logBusinessWarning("终止合同", "失败", err)
        alert(`终止合同失败: ${err.message}`)
      }
    },
    [supabase, loadRentals]
  )

  const handleApproveRentalApply = useCallback(
    async (rental: any) => {
      try {
        if (!supabase) return
        const { error } = await supabase.from("rentals").update({ status: "pending_delivery" }).eq("id", rental.id)
        if (error) throw error
        alert("已通过，状态已设为「待交付」")
        loadRentals()
      } catch (err: any) {
        logBusinessWarning("审核通过", "失败", err)
        alert(`操作失败: ${err.message}`)
      }
    },
    [supabase, loadRentals]
  )

  const handleRejectRentalApply = useCallback(
    async (rental: any) => {
      const reason = window.prompt("驳回原因（可选，将追加到备注）：")
      try {
        if (!supabase) return
        const updates: { status: string; notes?: string } = { status: "returned" }
        if (reason != null && reason.trim()) {
          updates.notes = [rental.notes, `[驳回] ${reason.trim()}`].filter(Boolean).join("\n")
        }
        const { error } = await supabase.from("rentals").update(updates).eq("id", rental.id)
        if (error) throw error
        alert("已驳回")
        loadRentals()
      } catch (err: any) {
        logBusinessWarning("审核驳回", "失败", err)
        alert(`操作失败: ${err.message}`)
      }
    },
    [supabase, loadRentals]
  )

  const handleCreateRental = useCallback(async () => {
    try {
      if (!supabase) return
      const validDevices = (newRental.devices || [{ device_name: "", device_sn: "" }]).filter(
        (d) => (d.device_name || "").trim() && (d.device_sn || "").trim()
      )
      if (!newRental.customer_name?.trim() || !newRental.customer_phone?.trim() || !newRental.start_date) {
        alert("请填写承租人姓名、联系电话和开始日期")
        return
      }
      if (validDevices.length === 0) {
        alert("请至少填写一条设备（设备名称与序列号）")
        return
      }
      const device_name = validDevices.length === 1 ? validDevices[0].device_name : "多台设备"
      const device_sn = validDevices.length === 1 ? validDevices[0].device_sn : "见下方明细"
      const { error } = await supabase.from("rentals").insert({
        customer_name: newRental.customer_name.trim(),
        customer_phone: newRental.customer_phone.trim(),
        device_name,
        device_sn,
        devices: validDevices,
        rent_amount: parseFloat(String(newRental.rent_amount)) || 0,
        deposit: parseFloat(String(newRental.deposit)) || 0,
        start_date: newRental.start_date,
        end_date: newRental.end_date || null,
        status: newRental.status,
        notes: newRental.notes?.trim() || null,
        restaurant_id: newRental.restaurant_id || null,
        source: newRental.source || "admin_create",
        agreement_id: activeRentalAgreementId || null,
      })
      if (error) throw error
      alert("租赁单创建成功")
      setIsAddRentalDialogOpen(false)
      setNewRental(initialNewRental)
      loadRentals()
    } catch (err: any) {
      logBusinessWarning("创建租赁", "失败", err)
      alert(`创建失败: ${err.message}`)
    }
  }, [supabase, newRental, loadRentals, activeRentalAgreementId])

  return (
    <>
      <RentalsDashboardPanel
        rentals={rentals}
        isLoadingRentals={isLoadingRentals}
        sourceFilter={rentalSourceFilter}
        onSourceFilterChange={setRentalSourceFilter}
        onOpenAddRental={handleOpenAddRental}
        onBatchSendReminder={handleBatchSendReminder}
        onSendReminder={handleSendReminder}
        onTerminateContract={handleTerminateContract}
        onViewDetail={(rental) => {
          setSelectedRental(rental)
          setIsRentalDetailDialogOpen(true)
        }}
        onApproveApply={handleApproveRentalApply}
        onRejectApply={handleRejectRentalApply}
      />

      {/* 新增租赁对话框 */}
      <Dialog open={isAddRentalDialogOpen} onOpenChange={setIsAddRentalDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">新增租赁</DialogTitle>
            <DialogDescription className="text-slate-400">
              创建新的设备租赁合同
              {activeRentalAgreementId && " · 将应用当前生效的租赁协议"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">承租人姓名 *</Label>
                <Input
                  value={newRental.customer_name}
                  onChange={(e) => setNewRental({ ...newRental, customer_name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="请输入承租人姓名"
                />
              </div>
              <div>
                <Label className="text-slate-300">联系电话 *</Label>
                <Input
                  value={newRental.customer_phone}
                  onChange={(e) => setNewRental({ ...newRental, customer_phone: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="请输入联系电话"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">设备明细（多种类可添加多行）*</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNewRental({
                      ...newRental,
                      devices: [...(newRental.devices || [{ device_name: "", device_sn: "" }]), { device_name: "", device_sn: "" }],
                    })
                  }
                  className="text-slate-300 border-slate-600"
                >
                  添加设备
                </Button>
              </div>
              {(newRental.devices || [{ device_name: "", device_sn: "" }]).map((row, index) => (
                <div key={index} className="flex gap-2 items-end p-2 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-400">设备名称</Label>
                      <Input
                        value={row.device_name}
                        onChange={(e) => {
                          const next = [...(newRental.devices || [])]
                          if (!next[index]) next[index] = { device_name: "", device_sn: "" }
                          next[index] = { ...next[index], device_name: e.target.value }
                          setNewRental({ ...newRental, devices: next })
                        }}
                        className="bg-slate-800 border-slate-700 text-white mt-1"
                        placeholder="如：双头灶、冷藏柜"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">设备序列号</Label>
                      <Input
                        value={row.device_sn}
                        onChange={(e) => {
                          const next = [...(newRental.devices || [])]
                          if (!next[index]) next[index] = { device_name: "", device_sn: "" }
                          next[index] = { ...next[index], device_sn: e.target.value }
                          setNewRental({ ...newRental, devices: next })
                        }}
                        className="bg-slate-800 border-slate-700 text-white mt-1"
                        placeholder="唯一序列号"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const next = (newRental.devices || []).filter((_, i) => i !== index)
                      setNewRental({ ...newRental, devices: next.length ? next : [{ device_name: "", device_sn: "" }] })
                    }}
                    className="text-red-400 hover:text-red-300 shrink-0"
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">关联客户门店（可选）</Label>
                <Select
                  value={newRental.restaurant_id || "none"}
                  onValueChange={(v) => setNewRental({ ...newRental, restaurant_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="不关联" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-white">
                      不关联
                    </SelectItem>
                    {availableRestaurants.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-white">
                        {r.name} {r.address ? `- ${r.address}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">来源</Label>
                <Select
                  value={newRental.source || "admin_create"}
                  onValueChange={(v: "admin_create" | "client_apply") => setNewRental({ ...newRental, source: v })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_create">后台新增</SelectItem>
                    <SelectItem value="client_apply">客户申请</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">月租金（元）</Label>
                <Input
                  type="number"
                  value={newRental.rent_amount}
                  onChange={(e) => setNewRental({ ...newRental, rent_amount: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-slate-300">押金（元）</Label>
                <Input
                  type="number"
                  value={newRental.deposit}
                  onChange={(e) => setNewRental({ ...newRental, deposit: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">开始日期 *</Label>
                <Input
                  type="date"
                  value={newRental.start_date}
                  onChange={(e) => setNewRental({ ...newRental, start_date: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300">结束日期</Label>
                <Input
                  type="date"
                  value={newRental.end_date}
                  onChange={(e) => setNewRental({ ...newRental, end_date: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">状态</Label>
              <Select value={newRental.status} onValueChange={(value) => setNewRental({ ...newRental, status: value as any })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_delivery">待交付</SelectItem>
                  <SelectItem value="active">租赁中</SelectItem>
                  <SelectItem value="expired">已到期</SelectItem>
                  <SelectItem value="returned">已收回</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">备注</Label>
              <Textarea
                value={newRental.notes}
                onChange={(e) => setNewRental({ ...newRental, notes: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="请输入备注信息"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsAddRentalDialogOpen(false)} className="border-slate-600 text-slate-300">
                取消
              </Button>
              <Button onClick={handleCreateRental} className="bg-blue-600 hover:bg-blue-700 text-white">
                创建
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 租赁详情对话框 */}
      <Dialog open={isRentalDetailDialogOpen} onOpenChange={setIsRentalDetailDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">租赁详情</DialogTitle>
            <DialogDescription className="text-slate-400">
              {Array.isArray(selectedRental?.devices) && selectedRental.devices.length > 0
                ? `共 ${selectedRental.devices.length} 台设备`
                : `设备序列号：${selectedRental?.device_sn}`}
            </DialogDescription>
          </DialogHeader>
          {selectedRental && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">承租人：</span>
                  <span className="text-white ml-2">{selectedRental.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400">联系电话：</span>
                  <span className="text-white ml-2">{selectedRental.customer_phone}</span>
                </div>
                {selectedRental.restaurant_id && (
                  <div className="col-span-2">
                    <span className="text-slate-400">关联门店：</span>
                    <span className="text-white ml-2">
                      {availableRestaurants.find((r) => r.id === selectedRental.restaurant_id)?.name || selectedRental.restaurant_id}
                    </span>
                  </div>
                )}
                {Array.isArray(selectedRental.devices) && selectedRental.devices.length > 0 ? (
                  <div className="col-span-2">
                    <span className="text-slate-400">设备明细：</span>
                    <ul className="mt-2 space-y-1 text-white">
                      {selectedRental.devices.map((d: { device_name?: string; device_sn?: string }, i: number) => (
                        <li key={i}>
                          {d.device_name || "—"} / 序列号：{d.device_sn || "—"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-slate-400">设备名称：</span>
                      <span className="text-white ml-2">{selectedRental.device_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">设备序列号：</span>
                      <span className="text-white ml-2">{selectedRental.device_sn}</span>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-slate-400">月租金：</span>
                  <span className="text-blue-400 font-bold ml-2">¥{parseFloat(selectedRental.rent_amount || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400">押金：</span>
                  <span className="text-white ml-2">¥{parseFloat(selectedRental.deposit || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400">开始日期：</span>
                  <span className="text-white ml-2">{selectedRental.start_date}</span>
                </div>
                <div>
                  <span className="text-slate-400">结束日期：</span>
                  <span className="text-white ml-2">{selectedRental.end_date || "未设置"}</span>
                </div>
                <div>
                  <span className="text-slate-400">状态：</span>
                  <Badge className={getRentalStatusColor(selectedRental.status)}>{getRentalStatusLabel(selectedRental.status)}</Badge>
                </div>
                {selectedRental.agreement_id && (
                  <div className="col-span-2">
                    <span className="text-slate-400">关联协议：</span>
                    <span className="text-white ml-2">已关联租赁协议</span>
                  </div>
                )}
                {selectedRental.notes && (
                  <div className="col-span-2">
                    <span className="text-slate-400">备注：</span>
                    <span className="text-white ml-2">{selectedRental.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
