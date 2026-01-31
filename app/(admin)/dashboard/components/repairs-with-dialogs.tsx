// 报修管理：面板 + 详情对话框（从 page 提取 state/loadRepairs/updateRepairStatus/useEffects）
// 对话框由 RepairsManagement 内部渲染，本组件仅负责数据与加载

"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { logBusinessWarning } from "@/lib/utils/logger"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import { supabase } from "@/lib/supabase"
import { RepairsManagement } from "./repairs-management"
import type { Restaurant, Worker } from "../types/dashboard-types"

export interface RepairsWithDialogsProps {
  restaurants: Restaurant[]
  workers: Worker[]
  userRole?: string | null
  userCompanyId?: string | null
}

export function RepairsWithDialogs({
  restaurants,
  workers,
  userRole,
  userCompanyId,
}: RepairsWithDialogsProps) {
  const searchParams = useSearchParams()

  const [repairs, setRepairs] = useState<any[]>([])
  const [isLoadingRepairs, setIsLoadingRepairs] = useState(false)
  const [repairStatusFilter, setRepairStatusFilter] = useState<string>("all")
  const [repairServiceTypeFilter, setRepairServiceTypeFilter] = useState<string>("all")
  const [selectedRepair, setSelectedRepair] = useState<any | null>(null)
  const [isRepairDetailDialogOpen, setIsRepairDetailDialogOpen] = useState(false)
  const [isUpdatingRepair, setIsUpdatingRepair] = useState(false)
  const [repairUpdateAmount, setRepairUpdateAmount] = useState<string>("")
  const [repairUpdateStatus, setRepairUpdateStatus] = useState<string>("")
  const [repairAssignedWorker, setRepairAssignedWorker] = useState<string>("none")
  const [platformRecommendation, setPlatformRecommendation] = useState<{
    recommended_worker_id: string
    recommended_worker_name: string | null
    reason: string
    takeover_mode?: "shadow" | "suggest" | "enforced"
  } | null>(null)
  const [repairRejectedReason, setRepairRejectedReason] = useState<string>("")
  const [repairRejectedCategory, setRepairRejectedCategory] = useState<string>("")

  const loadRepairs = useCallback(
    async (override?: { status?: string; serviceType?: string }) => {
      if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
        setRepairs([])
        setIsLoadingRepairs(false)
        return
      }
      try {
        setIsLoadingRepairs(true)
        const statusFilter = override?.status ?? repairStatusFilter
        const serviceTypeFilter = override?.serviceType ?? repairServiceTypeFilter
        const params = new URLSearchParams()
        if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)
        if (serviceTypeFilter && serviceTypeFilter !== "all") params.append("service_type", serviceTypeFilter)
        const url = `/api/repair/list${params.toString() ? `?${params.toString()}` : ""}`
        const response = await fetchWithAuth(url, { credentials: "include" })
        if (!response.ok) {
          const errorText = await response.text()
          logBusinessWarning("Admin Dashboard", "接口返回错误", { status: response.status, errorText })
          if (response.status === 401) {
            let errorDetails = "未授权"
            try {
              const errorData = await response.json()
              errorDetails = errorData.details || errorData.error || "未授权"
            } catch {
              //
            }
            if (userRole === "super_admin") {
              alert(`获取报修列表失败：${errorDetails}。\n\n请刷新页面（F5）后重试。`)
              setRepairs([])
              return
            }
            window.location.href = "/login"
            return
          }
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
        }
        const result = await response.json()
        if (result.success) {
          setRepairs(result.data || [])
        } else {
          if (result.error === "未授权" || result.details?.includes("请先登录")) {
            if (userRole === "super_admin") {
              alert("获取报修列表失败：请刷新页面重试")
              setRepairs([])
              return
            }
            window.location.href = "/login"
            return
          }
          throw new Error(result.error || "获取维修列表失败")
        }
      } catch (error) {
        logBusinessWarning("Admin Dashboard", "加载报修时出错", error)
        if (error instanceof Error) {
          if (
            error.message.includes("401") ||
            error.message.includes("未授权") ||
            error.message.includes("请先登录")
          ) {
            if (userRole === "super_admin") {
              alert("获取报修列表失败：请刷新页面重试")
              setRepairs([])
              return
            }
            window.location.href = "/login"
            return
          }
          alert(`加载报修列表失败: ${error.message}`)
        }
        setRepairs([])
      } finally {
        setIsLoadingRepairs(false)
      }
    },
    [repairStatusFilter, repairServiceTypeFilter, userRole, userCompanyId]
  )

  const updateRepairStatus = useCallback(
    async (
      repairId: string,
      status: string,
      amount?: number,
      assignedTo?: string,
      rejectedReason?: string,
      rejectedCategory?: string
    ) => {
      if (!supabase) {
        alert("数据库连接失败")
        return
      }
      try {
        setIsUpdatingRepair(true)
        const validStatuses = ["pending", "processing", "completed", "cancelled"]
        if (!validStatuses.includes(status)) {
          alert(`无效的状态值: ${status}`)
          setIsUpdatingRepair(false)
          return
        }
        if (status === "completed") {
          if (amount === undefined || amount === null) {
            alert("完成报修必须提供维修金额")
            setIsUpdatingRepair(false)
            return
          }
          if (isNaN(amount) || amount <= 0) {
            alert("维修金额必须是大于0的有效数字")
            setIsUpdatingRepair(false)
            return
          }
        }
        const response = await fetchWithAuth("/api/repair/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id: repairId,
            status,
            amount,
            assigned_to: assignedTo,
            rejected_reason: rejectedReason,
            rejected_category: rejectedCategory,
          }),
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "未知错误" }))
          alert(`更新失败: ${errorData.error || errorData.details || "未知错误"}`)
          setIsUpdatingRepair(false)
          return
        }
        const result = await response.json()
        if (!result.success || !result.data) {
          alert(`更新失败: ${result.error || "未返回更新后的数据"}`)
          setIsUpdatingRepair(false)
          return
        }
        const updatedRepair = result.data
        await loadRepairs()
        setIsRepairDetailDialogOpen(false)
        setSelectedRepair(null)
        setRepairUpdateAmount("")
        setRepairUpdateStatus("")
        setRepairAssignedWorker("none")
        setRepairRejectedReason("")
        setRepairRejectedCategory("")
        if (status === "completed") {
          const finalAmount = updatedRepair.amount || amount || 0
          alert(`报修工单已完成，维修金额: ¥${finalAmount.toFixed(2)}`)
        } else {
          alert(
            `报修工单状态已更新为: ${
              status === "pending" ? "待处理" : status === "processing" ? "处理中" : status === "cancelled" ? "已取消" : status
            }`
          )
        }
      } catch (error: any) {
        logBusinessWarning("Admin Dashboard", "更新报修时出错", error)
        alert(`更新报修失败: ${error?.message || "未知错误"}`)
      } finally {
        setIsUpdatingRepair(false)
      }
    },
    [loadRepairs]
  )

  useEffect(() => {
    loadRepairs()
  }, [loadRepairs])

  useEffect(() => {
    if (repairs.length === 0) return
    const repairId = searchParams.get("id") || searchParams.get("repairId")
    if (!repairId) return
    const repair = repairs.find((r: any) => r.id === repairId)
    if (repair) {
      setSelectedRepair(repair)
      setRepairUpdateStatus(repair.status)
      setRepairUpdateAmount(repair.amount?.toString() || "")
      setRepairAssignedWorker(repair.assigned_to || repair.worker_id || "none")
      setIsRepairDetailDialogOpen(true)
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname)
      }
    }
  }, [searchParams, repairs])

  useEffect(() => {
    if (selectedRepair && isRepairDetailDialogOpen) {
      fetchWithAuth(
        `/api/platform/dispatch/recommend?task_id=${selectedRepair.id}&task_type=repair`,
        { credentials: "include" }
      )
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data?.recommended_worker_id) {
            setPlatformRecommendation({
              recommended_worker_id: res.data.recommended_worker_id,
              recommended_worker_name: res.data.recommended_worker_name ?? null,
              reason: res.data.reason ?? "技能匹配",
              takeover_mode: res.data.takeover_mode,
            })
          } else {
            setPlatformRecommendation(null)
          }
        })
        .catch(() => setPlatformRecommendation(null))
    } else {
      setPlatformRecommendation(null)
      setRepairRejectedReason("")
      setRepairRejectedCategory("")
    }
  }, [selectedRepair?.id, isRepairDetailDialogOpen])

  useEffect(() => {
    if (!supabase) return
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let isSubscribed = true
    const channel = supabase
      .channel("repairs-realtime-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: "service_type=eq.维修服务",
        },
        () => {
          if (!isSubscribed) return
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            if (isSubscribed) loadRepairs()
          }, 2000)
        }
      )
      .subscribe()
    return () => {
      isSubscribed = false
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
    }
  }, [supabase, loadRepairs])

  return (
    <RepairsManagement
      repairs={repairs}
      isLoadingRepairs={isLoadingRepairs}
      repairStatusFilter={repairStatusFilter}
      onRepairStatusFilterChange={(status) => {
        setRepairStatusFilter(status)
        loadRepairs({ status })
      }}
      repairServiceTypeFilter={repairServiceTypeFilter}
      onRepairServiceTypeFilterChange={(type) => {
        setRepairServiceTypeFilter(type)
        loadRepairs({ serviceType: type })
      }}
      restaurants={restaurants}
      workers={workers}
      selectedRepair={selectedRepair}
      onSelectedRepairChange={setSelectedRepair}
      isRepairDetailDialogOpen={isRepairDetailDialogOpen}
      onRepairDetailDialogOpenChange={setIsRepairDetailDialogOpen}
      repairUpdateStatus={repairUpdateStatus}
      onRepairUpdateStatusChange={setRepairUpdateStatus}
      repairUpdateAmount={repairUpdateAmount}
      onRepairUpdateAmountChange={setRepairUpdateAmount}
      repairAssignedWorker={repairAssignedWorker}
      onRepairAssignedWorkerChange={setRepairAssignedWorker}
      platformRecommendation={platformRecommendation}
      repairRejectedReason={repairRejectedReason}
      onRepairRejectedReasonChange={setRepairRejectedReason}
      repairRejectedCategory={repairRejectedCategory}
      onRepairRejectedCategoryChange={setRepairRejectedCategory}
      isUpdatingRepair={isUpdatingRepair}
      onUpdateRepairStatus={updateRepairStatus}
    />
  )
}
