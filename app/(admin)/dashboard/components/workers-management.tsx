"use client"

// 工人管理组件
// 从 page.tsx 的 renderWorkers() 函数提取

import { Plus, Edit, Trash2, User, Phone, Truck, Wrench, HardHat, Package, Loader2, CheckCircle2, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Worker } from "../types/dashboard-types"

export interface WorkerFormState {
  name: string
  phone: string
  worker_types: string[]
  product_types: string[]
  status: "active" | "inactive"
}

function getWorkerTypeLabel(type?: string | string[] | null): string {
  if (Array.isArray(type)) {
    const validTypes: string[] = []
    for (const t of type) {
      if (typeof t === "string") {
        if (t.startsWith("[") && t.endsWith("]")) {
          try {
            const parsed = JSON.parse(t)
            if (Array.isArray(parsed)) {
              validTypes.push(...parsed.filter((p: unknown) => typeof p === "string" && ["delivery", "repair", "install"].includes(p)))
            } else if (typeof parsed === "string" && ["delivery", "repair", "install"].includes(parsed)) {
              validTypes.push(parsed)
            }
          } catch {
            if (["delivery", "repair", "install"].includes(t)) validTypes.push(t)
          }
        } else if (["delivery", "repair", "install"].includes(t)) {
          validTypes.push(t)
        }
      }
    }
    const uniqueTypes = Array.from(new Set(validTypes))
    return uniqueTypes
      .map((t) => {
        switch (t) {
          case "delivery":
            return "配送员"
          case "repair":
            return "维修工"
          case "install":
            return "安装工"
          default:
            return t
        }
      })
      .join("、")
  }
  if (typeof type === "string") {
    if (type.startsWith("[") && type.endsWith("]")) {
      try {
        const parsed = JSON.parse(type)
        if (Array.isArray(parsed)) return getWorkerTypeLabel(parsed)
      } catch {
        // ignore
      }
    }
    switch (type) {
      case "delivery":
        return "配送员"
      case "repair":
        return "维修工"
      case "install":
        return "安装工"
      default:
        return "未分类"
    }
  }
  return "未分类"
}

function getWorkerTypeColor(type?: string | string[] | null): string {
  if (Array.isArray(type) && type.length > 1) {
    return "bg-gradient-to-r from-orange-500/20 via-purple-500/20 to-blue-500/20 text-white border-orange-500/30"
  }
  if (Array.isArray(type) && type.length === 1) {
    type = type[0]
  }
  switch (type) {
    case "delivery":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30"
    case "repair":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30"
    case "install":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }
}

function getProductTypeLabel(productType: string): string {
  switch (productType) {
    case "lpg":
      return "液化气"
    case "clean":
      return "热能清洁燃料"
    case "alcohol":
      return "醇基燃料"
    case "outdoor":
      return "户外环保燃料"
    default:
      return productType
  }
}

interface WorkersManagementProps {
  workers: Worker[]
  onAddWorkerClick: () => void
  isAddWorkerDialogOpen: boolean
  onAddWorkerDialogOpenChange: (open: boolean) => void
  newWorker: WorkerFormState
  onNewWorkerChange: (v: WorkerFormState) => void
  onAddWorker: () => void
  isAddingWorker: boolean
  onOpenEditWorker: (worker: Worker) => void
  onDeleteWorker: (workerId: string, workerName: string) => void
  isDeletingWorker: boolean
  deletingWorkerId: string | null
  isEditWorkerDialogOpen: boolean
  onEditWorkerDialogOpenChange: (open: boolean) => void
  editingWorker: Worker | null
  editWorker: WorkerFormState
  onEditWorkerChange: (v: WorkerFormState) => void
  onUpdateWorker: () => void
  isUpdatingWorker: boolean
  onResetNewWorker: () => void
  onCloseEditDialog: () => void
}

export function WorkersManagement({
  workers,
  onAddWorkerClick,
  isAddWorkerDialogOpen,
  onAddWorkerDialogOpenChange,
  newWorker,
  onNewWorkerChange,
  onAddWorker,
  isAddingWorker,
  onOpenEditWorker,
  onDeleteWorker,
  isDeletingWorker,
  deletingWorkerId,
  isEditWorkerDialogOpen,
  onEditWorkerDialogOpenChange,
  editingWorker,
  editWorker,
  onEditWorkerChange,
  onUpdateWorker,
  isUpdatingWorker,
  onResetNewWorker,
  onCloseEditDialog,
}: WorkersManagementProps) {
  const deliveryWorkers = workers.filter((w) => {
    if (Array.isArray(w.worker_type)) return w.worker_type.includes("delivery")
    return w.worker_type === "delivery"
  })
  const repairWorkers = workers.filter((w) => {
    if (Array.isArray(w.worker_type)) return w.worker_type.includes("repair")
    return w.worker_type === "repair"
  })
  const installWorkers = workers.filter((w) => {
    if (Array.isArray(w.worker_type)) return w.worker_type.includes("install")
    return w.worker_type === "install"
  })

  const workerTypeOptions = [
    { id: "delivery", name: "配送员", icon: Truck, color: "text-orange-400" },
    { id: "repair", name: "维修工", icon: Wrench, color: "text-purple-400" },
    { id: "install", name: "安装工", icon: HardHat, color: "text-blue-400" },
  ]
  const productOptions = [
    { id: "lpg", name: "液化气" },
    { id: "clean", name: "热能清洁燃料" },
    { id: "alcohol", name: "醇基燃料" },
    { id: "outdoor", name: "户外环保燃料" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">工人管理</h1>
          <p className="text-slate-400">管理配送、维修、安装工人信息</p>
        </div>
        <Button onClick={onAddWorkerClick} className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700">
          <Plus className="h-4 w-4 mr-2" />
          添加工人
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">总工人数</CardDescription>
            <CardTitle className="text-3xl text-white">{workers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-orange-950/90 border-orange-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">配送员</CardDescription>
            <CardTitle className="text-3xl text-orange-400">{deliveryWorkers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-purple-950/90 border-purple-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">维修工</CardDescription>
            <CardTitle className="text-3xl text-purple-400">{repairWorkers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-cyan-950/90 border-cyan-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">安装工</CardDescription>
            <CardTitle className="text-3xl text-cyan-400">{installWorkers.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((worker) => {
          const types = Array.isArray(worker.worker_type) ? worker.worker_type : worker.worker_type ? [worker.worker_type] : []
          const avatarClass =
            types.length > 1
              ? "bg-gradient-to-br from-orange-500 via-purple-500 to-blue-500"
              : types.includes("delivery")
                ? "bg-gradient-to-br from-orange-500 to-red-600"
                : types.includes("repair")
                  ? "bg-gradient-to-br from-purple-500 to-pink-600"
                  : types.includes("install")
                    ? "bg-gradient-to-br from-blue-500 to-cyan-600"
                    : "bg-gradient-to-br from-slate-500 to-slate-600"
          const AvatarIcon =
            types.length > 1 ? Package : types.includes("delivery") ? Truck : types.includes("repair") ? Wrench : types.includes("install") ? HardHat : User

          return (
            <Card key={worker.id} semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${avatarClass}`}>
                      <AvatarIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white">{worker.name}</CardTitle>
                      <CardDescription className="text-slate-400">ID: {worker.id.slice(0, 12)}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getWorkerTypeColor(worker.worker_type)}>{getWorkerTypeLabel(worker.worker_type)}</Badge>
                    {worker.status === "inactive" && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">已离职</Badge>
                    )}
                  </div>
                  {worker.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Phone className="h-4 w-4" />
                      {worker.phone}
                    </div>
                  )}
                  {types.includes("delivery") && worker.product_types && worker.product_types.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">负责产品类型:</div>
                      <div className="flex flex-wrap gap-1">
                        {worker.product_types.map((pt) => (
                          <Badge key={pt} variant="outline" className="text-xs border-slate-600 text-slate-400">
                            {getProductTypeLabel(pt)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                      onClick={() => onOpenEditWorker(worker)}
                      disabled={isDeletingWorker}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                      onClick={() => onDeleteWorker(worker.id, worker.name)}
                      disabled={isDeletingWorker && deletingWorkerId === worker.id}
                    >
                      {isDeletingWorker && deletingWorkerId === worker.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          删除中...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {workers.length === 0 && (
        <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">暂无工人</p>
          </CardContent>
        </Card>
      )}

      {/* 添加工人对话框 */}
      <Dialog open={isAddWorkerDialogOpen} onOpenChange={onAddWorkerDialogOpenChange}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-400" />
              添加工人
            </DialogTitle>
            <DialogDescription className="text-slate-400">添加新的工人并设置业务类型和权限</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">姓名 <span className="text-red-400">*</span></Label>
              <Input
                placeholder="请输入工人姓名"
                value={newWorker.name}
                onChange={(e) => onNewWorkerChange({ ...newWorker, name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">联系电话 <span className="text-red-400">*</span></Label>
              <Input
                type="tel"
                placeholder="请输入联系电话"
                value={newWorker.phone}
                onChange={(e) => onNewWorkerChange({ ...newWorker, phone: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">工人类型 <span className="text-red-400">*</span> <span className="text-xs text-slate-500 ml-2">（可多选，支持一人多职）</span></Label>
              <div className="space-y-2 border border-slate-700 rounded-lg p-3 bg-slate-800/50">
                {workerTypeOptions.map((type) => {
                  const Icon = type.icon
                  return (
                    <div key={type.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`worker-type-${type.id}`}
                        checked={newWorker.worker_types.includes(type.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onNewWorkerChange({ ...newWorker, worker_types: [...newWorker.worker_types, type.id] })
                          } else {
                            onNewWorkerChange({
                              ...newWorker,
                              worker_types: newWorker.worker_types.filter((wt) => wt !== type.id),
                              product_types: type.id === "delivery" ? [] : newWorker.product_types,
                            })
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor={`worker-type-${type.id}`} className="text-sm text-slate-300 cursor-pointer flex items-center gap-2 flex-1">
                        <Icon className={`h-4 w-4 ${type.color}`} />
                        {type.name}
                      </Label>
                    </div>
                  )
                })}
              </div>
            </div>
            {newWorker.worker_types.includes("delivery") && (
              <div className="space-y-2">
                <Label className="text-slate-300">负责产品类型 <span className="text-red-400">*</span></Label>
                <div className="space-y-2">
                  {productOptions.map((product) => (
                    <div key={product.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`product-${product.id}`}
                        checked={newWorker.product_types.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onNewWorkerChange({ ...newWorker, product_types: [...newWorker.product_types, product.id] })
                          } else {
                            onNewWorkerChange({ ...newWorker, product_types: newWorker.product_types.filter((pt) => pt !== product.id) })
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor={`product-${product.id}`} className="text-sm text-slate-300 cursor-pointer">
                        {product.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-slate-300">状态</Label>
              <Select
                value={newWorker.status}
                onValueChange={(value: "active" | "inactive") => onNewWorkerChange({ ...newWorker, status: value })}
              >
                <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="active" className="text-white hover:bg-slate-700">在职</SelectItem>
                  <SelectItem value="inactive" className="text-white hover:bg-slate-700">离职</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={onResetNewWorker} className="text-slate-400 hover:text-white" disabled={isAddingWorker}>
              取消
            </Button>
            <Button onClick={onAddWorker} disabled={isAddingWorker} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isAddingWorker ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  添加中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  添加
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑工人对话框 */}
      <Dialog open={isEditWorkerDialogOpen} onOpenChange={onEditWorkerDialogOpenChange}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-400" />
              编辑工人信息
            </DialogTitle>
            <DialogDescription className="text-slate-400">修改工人的业务类型和权限</DialogDescription>
          </DialogHeader>
          {editingWorker && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">姓名 <span className="text-red-400">*</span></Label>
                <Input
                  placeholder="请输入工人姓名"
                  value={editWorker.name}
                  onChange={(e) => onEditWorkerChange({ ...editWorker, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">联系电话 <span className="text-red-400">*</span></Label>
                <Input
                  type="tel"
                  placeholder="请输入联系电话"
                  value={editWorker.phone}
                  onChange={(e) => onEditWorkerChange({ ...editWorker, phone: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">工人类型 <span className="text-red-400">*</span> <span className="text-xs text-slate-500 ml-2">（可多选，支持一人多职）</span></Label>
                <div className="space-y-2 border border-slate-700 rounded-lg p-3 bg-slate-800/50">
                  {workerTypeOptions.map((type) => {
                    const Icon = type.icon
                    return (
                      <div key={type.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-worker-type-${type.id}`}
                          checked={editWorker.worker_types.includes(type.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onEditWorkerChange({ ...editWorker, worker_types: [...editWorker.worker_types, type.id] })
                            } else {
                              onEditWorkerChange({
                                ...editWorker,
                                worker_types: editWorker.worker_types.filter((wt) => wt !== type.id),
                                product_types: type.id === "delivery" ? [] : editWorker.product_types,
                              })
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor={`edit-worker-type-${type.id}`} className="text-sm text-slate-300 cursor-pointer flex items-center gap-2 flex-1">
                          <Icon className={`h-4 w-4 ${type.color}`} />
                          {type.name}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>
              {editWorker.worker_types.includes("delivery") && (
                <div className="space-y-2">
                  <Label className="text-slate-300">负责产品类型 <span className="text-red-400">*</span></Label>
                  <div className="space-y-2">
                    {productOptions.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-product-${product.id}`}
                          checked={editWorker.product_types.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onEditWorkerChange({ ...editWorker, product_types: [...editWorker.product_types, product.id] })
                            } else {
                              onEditWorkerChange({ ...editWorker, product_types: editWorker.product_types.filter((pt) => pt !== product.id) })
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor={`edit-product-${product.id}`} className="text-sm text-slate-300 cursor-pointer">
                          {product.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-slate-300">状态</Label>
                <Select value={editWorker.status} onValueChange={(value: "active" | "inactive") => onEditWorkerChange({ ...editWorker, status: value })}>
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="active" className="text-white hover:bg-slate-700">在职</SelectItem>
                    <SelectItem value="inactive" className="text-white hover:bg-slate-700">离职</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={onCloseEditDialog} className="text-slate-400 hover:text-white" disabled={isUpdatingWorker}>
              取消
            </Button>
            <Button onClick={onUpdateWorker} disabled={isUpdatingWorker} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isUpdatingWorker ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  保存更改
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
