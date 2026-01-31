// 工人管理：面板 + 添加工人/编辑工人对话框（从 page 提取 state/handlers，workers/loadWorkers 由父级传入）

"use client"

import { useState, useCallback } from "react"
import { logBusinessWarning } from "@/lib/utils/logger"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import { supabase } from "@/lib/supabase"
import { WorkersManagement } from "./workers-management"
import type { Worker } from "../types/dashboard-types"
import type { WorkerFormState } from "./workers-management"

const initialNewWorker: WorkerFormState = {
  name: "",
  phone: "",
  worker_types: [],
  product_types: [],
  status: "active",
}

export interface WorkersWithDialogsProps {
  workers: Worker[]
  onRefreshWorkers: () => void | Promise<void>
  userRole?: string | null
  userCompanyId?: string | null
}

export function WorkersWithDialogs({
  workers,
  onRefreshWorkers,
}: WorkersWithDialogsProps) {
  const [isAddWorkerDialogOpen, setIsAddWorkerDialogOpen] = useState(false)
  const [newWorker, setNewWorker] = useState<WorkerFormState>(initialNewWorker)
  const [isAddingWorker, setIsAddingWorker] = useState(false)
  const [isEditWorkerDialogOpen, setIsEditWorkerDialogOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [editWorker, setEditWorker] = useState<WorkerFormState>(initialNewWorker)
  const [isUpdatingWorker, setIsUpdatingWorker] = useState(false)
  const [isDeletingWorker, setIsDeletingWorker] = useState(false)
  const [deletingWorkerId, setDeletingWorkerId] = useState<string | null>(null)

  const handleAddWorker = useCallback(async () => {
    if (!newWorker.name || !newWorker.phone || newWorker.worker_types.length === 0) {
      alert("请填写完整信息：姓名、电话和至少选择一个工人类型")
      return
    }
    if (newWorker.worker_types.includes("delivery") && newWorker.product_types.length === 0) {
      alert("配送员必须至少选择一个产品类型")
      return
    }
    setIsAddingWorker(true)
    try {
      if (!supabase) throw new Error("数据库连接失败，请检查 Supabase 配置")
      const checkResponse = await fetchWithAuth("/api/worker/check-table")
      const checkResult = await checkResponse.json()
      if (!checkResult.exists) {
        throw new Error(
          "数据库表不存在！请打开 Supabase SQL Editor 执行 CREATE_WORKERS_TABLE_FINAL.sql 后重试。"
        )
      }
      let workerTypeValue: string
      if (newWorker.worker_types.length === 1) workerTypeValue = newWorker.worker_types[0]
      else if (newWorker.worker_types.length > 1) workerTypeValue = JSON.stringify(newWorker.worker_types)
      else throw new Error("至少需要选择一个工人类型")
      const workerData: any = {
        name: newWorker.name.trim(),
        phone: newWorker.phone.trim(),
        worker_type: workerTypeValue,
        status: newWorker.status,
      }
      if (newWorker.worker_types.includes("delivery")) workerData.product_types = newWorker.product_types
      else workerData.product_types = []
      const { error } = await supabase
        .from("workers")
        .insert(workerData)
        .select("id, name, phone, worker_type, product_types, status, created_at, updated_at")
        .single()
      if (error) {
        logBusinessWarning("Admin Dashboard", "添加工人失败", error)
        if (error.code === "42P01") throw new Error("数据库表不存在，请执行 CREATE_WORKERS_TABLE_FINAL.sql")
        if (error.code === "42501") throw new Error("权限不足，请检查 Supabase RLS 策略")
        throw new Error(error.message || "添加工人失败")
      }
      await onRefreshWorkers()
      setNewWorker(initialNewWorker)
      setIsAddWorkerDialogOpen(false)
      alert("工人添加成功")
    } catch (e: any) {
      alert(`添加工人失败: ${e?.message || "未知错误"}`)
    } finally {
      setIsAddingWorker(false)
    }
  }, [newWorker, onRefreshWorkers])

  const handleOpenEditDialog = useCallback((worker: Worker) => {
    setEditingWorker(worker)
    let productTypes: string[] = []
    if (typeof worker.product_types === "string") {
      try {
        productTypes = JSON.parse(worker.product_types || "[]")
      } catch {
        productTypes = []
      }
    } else if (Array.isArray(worker.product_types)) productTypes = worker.product_types
    let workerTypes: string[] = []
    if (Array.isArray(worker.worker_type)) workerTypes = worker.worker_type
    else if (typeof worker.worker_type === "string") {
      try {
        const parsed = JSON.parse(worker.worker_type)
        workerTypes = Array.isArray(parsed) ? parsed : [worker.worker_type]
      } catch {
        workerTypes = [worker.worker_type]
      }
    }
    setEditWorker({
      name: worker.name || "",
      phone: worker.phone || "",
      worker_types: workerTypes,
      product_types: productTypes,
      status: (worker.status as "active" | "inactive") || "active",
    })
    setIsEditWorkerDialogOpen(true)
  }, [])

  const handleUpdateWorker = useCallback(async () => {
    if (!editingWorker) return
    if (!editWorker.name || !editWorker.phone || editWorker.worker_types.length === 0) {
      alert("请填写完整信息：姓名、电话和至少选择一个工人类型")
      return
    }
    if (editWorker.worker_types.includes("delivery") && editWorker.product_types.length === 0) {
      alert("配送员必须至少选择一个产品类型")
      return
    }
    setIsUpdatingWorker(true)
    try {
      if (!supabase) throw new Error("数据库连接失败")
      let workerTypeValue: string
      if (editWorker.worker_types.length === 1) workerTypeValue = editWorker.worker_types[0]
      else if (editWorker.worker_types.length > 1) workerTypeValue = JSON.stringify(editWorker.worker_types)
      else throw new Error("至少需要选择一个工人类型")
      const updateData: any = {
        name: editWorker.name.trim(),
        phone: editWorker.phone.trim(),
        worker_type: workerTypeValue,
        status: editWorker.status,
        updated_at: new Date().toISOString(),
      }
      if (editWorker.worker_types.includes("delivery")) updateData.product_types = editWorker.product_types
      else updateData.product_types = []
      const { error } = await supabase
        .from("workers")
        .update(updateData)
        .eq("id", editingWorker.id)
        .select()
        .single()
      if (error) {
        logBusinessWarning("Admin Dashboard", "更新工人失败", error)
        throw new Error(error.message || "更新工人失败")
      }
      await onRefreshWorkers()
      setIsEditWorkerDialogOpen(false)
      setEditingWorker(null)
      alert("工人信息更新成功")
    } catch (e: any) {
      alert(`更新工人失败: ${e?.message || "未知错误"}`)
    } finally {
      setIsUpdatingWorker(false)
    }
  }, [editingWorker, editWorker, onRefreshWorkers])

  const handleDeleteWorker = useCallback(
    async (workerId: string, workerName: string) => {
      if (!window.confirm(`确定要删除工人 "${workerName}" 吗？此操作不可恢复！`)) return
      setIsDeletingWorker(true)
      setDeletingWorkerId(workerId)
      try {
        if (!supabase) throw new Error("数据库连接失败")
        const { error } = await supabase.from("workers").delete().eq("id", workerId)
        if (error) {
          logBusinessWarning("Admin Dashboard", "删除工人失败", error)
          throw new Error(error.message || "删除工人失败")
        }
        await onRefreshWorkers()
        alert("工人删除成功")
      } catch (e: any) {
        alert(`删除工人失败: ${e?.message || "未知错误"}`)
      } finally {
        setIsDeletingWorker(false)
        setDeletingWorkerId(null)
      }
    },
    [onRefreshWorkers]
  )

  return (
    <WorkersManagement
      workers={workers}
      onAddWorkerClick={() => setIsAddWorkerDialogOpen(true)}
      isAddWorkerDialogOpen={isAddWorkerDialogOpen}
      onAddWorkerDialogOpenChange={setIsAddWorkerDialogOpen}
      newWorker={newWorker}
      onNewWorkerChange={setNewWorker}
      onAddWorker={handleAddWorker}
      isAddingWorker={isAddingWorker}
      onOpenEditWorker={handleOpenEditDialog}
      onDeleteWorker={handleDeleteWorker}
      isDeletingWorker={isDeletingWorker}
      deletingWorkerId={deletingWorkerId}
      isEditWorkerDialogOpen={isEditWorkerDialogOpen}
      onEditWorkerDialogOpenChange={setIsEditWorkerDialogOpen}
      editingWorker={editingWorker}
      editWorker={editWorker}
      onEditWorkerChange={setEditWorker}
      onUpdateWorker={handleUpdateWorker}
      isUpdatingWorker={isUpdatingWorker}
      onResetNewWorker={() => {
        setIsAddWorkerDialogOpen(false)
        setNewWorker(initialNewWorker)
      }}
      onCloseEditDialog={() => {
        setIsEditWorkerDialogOpen(false)
        setEditingWorker(null)
        setEditWorker(initialNewWorker)
      }}
    />
  )
}
