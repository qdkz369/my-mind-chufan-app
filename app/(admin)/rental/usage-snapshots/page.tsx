/**
 * Usage Snapshot 查看页（只读）
 * 
 * ⛔ Usage Snapshot 阶段明确禁止事项（非常重要）：
 * 1. 禁止生成账单：禁止基于 Usage Snapshot 生成账单（bill/invoice）
 * 2. 禁止生成应收应付：禁止基于 Usage Snapshot 生成应收/应付
 * 3. 禁止计算金额：禁止基于 usage_value 计算任何金额
 * 4. 禁止对订单状态产生任何反向影响：禁止基于 Snapshot 修改订单状态、阻止订单创建、触发订单流程变更
 * 5. 禁止在 Snapshot 中修改或纠正 Facts：禁止修改 Facts 数据、纠正 Facts 值、反向更新 Facts 表
 * 
 * 功能：
 * - 列表展示 Usage Snapshot（只读）
 * - 不允许编辑 usage_value
 * - 不展示任何金额字段
 * - 管理员仅能：标记 disputed、标记 locked
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { logBusinessWarning } from "@/lib/utils/logger"
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Lock,
  AlertCircle as AlertCircleIcon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import type { UsageSnapshot } from "@/lib/rental/usage-snapshot"
import { RentalUIProvider } from "@/lib/ui-contexts"

interface UsageSnapshotWithRelations extends UsageSnapshot {
  devices?: {
    device_id: string
    model: string | null
  } | null
  rental_contracts?: {
    id: string
    contract_no: string
  } | null
}

export default function UsageSnapshotsPage() {
  const router = useRouter()
  const [snapshots, setSnapshots] = useState<UsageSnapshotWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  // 权限验证
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsAuthenticated(false)
        router.push("/login")
        return
      }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          setIsAuthenticated(false)
          router.push("/login")
          return
        }

        // 检查用户角色
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()

        if (roleError || !roleData) {
          setIsAuthenticated(false)
          router.push("/login")
          return
        }

        const actualRole = Array.isArray(roleData) ? roleData[0]?.role : roleData.role

        if (actualRole !== "super_admin" && actualRole !== "admin") {
          setIsAuthenticated(false)
          router.push("/login")
          return
        }

        setIsAuthenticated(true)
        loadSnapshots()
      } catch (err) {
        logBusinessWarning('Usage Snapshot', '权限验证失败', err)
        setIsAuthenticated(false)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  // 加载快照列表
  const loadSnapshots = async () => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch("/api/admin/rental/usage-snapshots", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || "加载失败")
        return
      }

      setSnapshots(result.data || [])
    } catch (err: any) {
      logBusinessWarning('Usage Snapshot', '加载快照列表失败', err)
      setError(err.message || "加载失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 更新快照状态
  const handleUpdateStatus = async (id: string, newStatus: "disputed" | "locked") => {
    if (!confirm(`确定要将此快照标记为 ${newStatus === "disputed" ? "争议" : "锁定"} 吗？`)) {
      return
    }

    try {
      setIsUpdating(id)

      const response = await fetch("/api/admin/rental/usage-snapshots", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status: newStatus,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        alert(`更新失败: ${result.error || "未知错误"}`)
        return
      }

      // 重新加载列表
      await loadSnapshots()
    } catch (err: any) {
      logBusinessWarning('Usage Snapshot', '更新状态失败', err)
      alert(`更新失败: ${err.message || "未知错误"}`)
    } finally {
      setIsUpdating(null)
    }
  }

  // 获取状态标签
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "草稿"
      case "confirmed":
        return "已确认"
      case "disputed":
        return "争议中"
      case "locked":
        return "已锁定"
      default:
        return status
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
      case "confirmed":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "disputed":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "locked":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  // 获取使用量计量单位标签
  const getUsageMetricLabel = (metric: string) => {
    switch (metric) {
      case "hours":
        return "小时"
      case "orders":
        return "订单数"
      case "energy":
        return "能耗"
      case "hybrid":
        return "混合"
      default:
        return metric
    }
  }

  // 获取事实来源标签
  const getFactSourceLabel = (source: string) => {
    switch (source) {
      case "order_facts":
        return "订单事实"
      case "device_facts":
        return "设备事实"
      case "manual_override":
        return "手动覆盖"
      default:
        return source
    }
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isAuthenticated === false) {
    return null
  }

  return (
    <RentalUIProvider>
      <main className="min-h-screen bg-background pb-20" data-density="dense">
      <div className="container mx-auto px-4 py-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/rental/contracts">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Usage Snapshot 查看</h1>
              <p className="text-muted-foreground mt-1">查看设备使用量快照（只读，不允许编辑 usage_value）</p>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-red-900/90 to-red-800/90 border-red-700/50 backdrop-blur-sm mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-400 font-medium">加载失败</p>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadSnapshots()}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  重试
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 快照列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground">加载中...</span>
          </div>
        ) : snapshots.length === 0 ? (
          <Card semanticLevel="system_hint" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {error ? "加载失败，请点击上方重试按钮" : "暂无 Usage Snapshot 记录"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {snapshots.map((snapshot) => (
              <Card
                key={snapshot.id}
                semanticLevel="secondary_fact"
                className="glass-breath p-6 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-foreground">
                        {snapshot.devices?.model || "未知设备"} ({snapshot.device_id})
                      </h3>
                      <Badge className={getStatusColor(snapshot.status)}>
                        {getStatusLabel(snapshot.status)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">合同编号：</span>
                        <span className="text-foreground ml-2">
                          {snapshot.rental_contracts?.contract_no || snapshot.rental_contract_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">计量单位：</span>
                        <span className="text-foreground ml-2">
                          {getUsageMetricLabel(snapshot.usage_metric)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">使用量：</span>
                        <span className="text-foreground ml-2 font-medium">
                          {snapshot.usage_value.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">事实来源：</span>
                        <span className="text-foreground ml-2">
                          {getFactSourceLabel(snapshot.fact_source)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <span className="text-muted-foreground">开始时间：</span>
                          <span className="text-foreground ml-2">
                            {new Date(snapshot.snapshot_start_at).toLocaleString("zh-CN")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <span className="text-muted-foreground">结束时间：</span>
                          <span className="text-foreground ml-2">
                            {new Date(snapshot.snapshot_end_at).toLocaleString("zh-CN")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <span className="text-muted-foreground">事实时间：</span>
                          <span className="text-foreground ml-2">
                            {new Date(snapshot.generated_from_fact_at).toLocaleString("zh-CN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex flex-col gap-2 ml-4">
                    {snapshot.status !== "locked" && (
                      <>
                        {snapshot.status !== "disputed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(snapshot.id, "disputed")}
                            disabled={isUpdating === snapshot.id}
                            className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                          >
                            {isUpdating === snapshot.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <AlertCircleIcon className="h-4 w-4 mr-2" />
                                标记争议
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(snapshot.id, "locked")}
                          disabled={isUpdating === snapshot.id}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          {isUpdating === snapshot.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              锁定
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    {snapshot.status === "locked" && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        <Lock className="h-3 w-3 mr-1" />
                        已锁定
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      </main>
    </RentalUIProvider>
  )
}
