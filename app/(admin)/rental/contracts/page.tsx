"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import type { RentalContract } from "@/lib/rental/types"

export default function RentalContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<RentalContract[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [restaurants, setRestaurants] = useState<Array<{ id: string; name: string }>>([])

  // 新建合同表单数据
  const [newContract, setNewContract] = useState({
    contract_no: "",
    lessee_restaurant_id: "",
    lessor_type: "" as "platform" | "manufacturer" | "leasing_company" | "finance_partner" | "",
    lessor_id: "",
    start_at: "",
    end_at: "",
    billing_model: "" as "fixed" | "usage_based" | "hybrid" | "",
    remark: "",
  })

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
      } catch (error) {
        console.error("[租赁合同页面] 权限验证失败:", error)
        setIsAuthenticated(false)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  // 加载合同列表
  const loadContracts = async () => {
    try {
      setIsLoading(true)
      setError("")

      const response = await fetch("/api/admin/rental/contracts")
      const result = await response.json()

      if (result.success) {
        setContracts(result.data || [])
      } else {
        setError(result.error || "加载失败")
      }
    } catch (err: any) {
      console.error("[租赁合同页面] 加载失败:", err)
      setError(err.message || "加载失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 加载餐厅列表
  const loadRestaurants = async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .order("name")

      if (error) {
        console.error("[租赁合同页面] 加载餐厅列表失败:", error)
        return
      }

      if (data) {
        setRestaurants(data)
      }
    } catch (err) {
      console.error("[租赁合同页面] 加载餐厅列表失败:", err)
    }
  }

  useEffect(() => {
    if (isAuthenticated === true) {
      loadContracts()
      loadRestaurants()
    }
  }, [isAuthenticated])

  // 创建合同
  const handleCreateContract = async () => {
    if (
      !newContract.contract_no ||
      !newContract.lessee_restaurant_id ||
      !newContract.lessor_type ||
      !newContract.lessor_id ||
      !newContract.start_at ||
      !newContract.end_at ||
      !newContract.billing_model
    ) {
      alert("请填写所有必填项")
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/admin/rental/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContract),
      })

      const result = await response.json()

      if (result.success) {
        setIsAddDialogOpen(false)
        setNewContract({
          contract_no: "",
          lessee_restaurant_id: "",
          lessor_type: "",
          lessor_id: "",
          start_at: "",
          end_at: "",
          billing_model: "",
          remark: "",
        })
        await loadContracts()
        alert("合同创建成功")
      } else {
        alert(`创建失败: ${result.error}${result.details ? ` - ${result.details}` : ""}`)
      }
    } catch (err: any) {
      alert(`创建失败: ${err.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "ended":
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
      case "breached":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  // 获取状态标签
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "草稿"
      case "active":
        return "生效中"
      case "ended":
        return "已结束"
      case "breached":
        return "违约"
      default:
        return status
    }
  }

  // 获取出租方类型标签
  const getLessorTypeLabel = (type: string) => {
    switch (type) {
      case "platform":
        return "平台"
      case "manufacturer":
        return "厂家"
      case "leasing_company":
        return "租赁公司"
      case "finance_partner":
        return "金融机构"
      default:
        return type
    }
  }

  // 获取计费模式标签
  const getBillingModelLabel = (model: string) => {
    switch (model) {
      case "fixed":
        return "固定费用"
      case "usage_based":
        return "按使用量计费"
      case "hybrid":
        return "混合模式"
      default:
        return model
    }
  }

  // 如果未通过权限验证，显示加载中
  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <main className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">检查权限中...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-20" data-density="dense">
      {/* 页面标题 */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted/50">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">租赁合同管理</h1>
            <p className="text-sm text-muted-foreground">管理设备租赁合同（仅录入，不展示金额）</p>
          </div>
        </div>

        {/* 操作栏 */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            新建合同
          </Button>
        </div>

        {/* 错误提示 */}
        {error && (
          <Card className="theme-card p-6 mb-6 border-destructive/30 bg-destructive/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div>
                <h3 className="text-lg font-bold text-destructive mb-1">加载失败</h3>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* 合同列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground">加载中...</span>
          </div>
        ) : contracts.length === 0 ? (
          <Card className="theme-card p-8">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">暂无合同</h3>
              <p className="text-sm text-muted-foreground">点击上方"新建合同"按钮创建第一个合同</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <Card key={contract.id} className="theme-card p-6 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-foreground">{contract.contract_no}</h3>
                      <Badge className={getStatusColor(contract.status)}>
                        {getStatusLabel(contract.status)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">出租方：</span>
                        <span className="text-foreground ml-2">
                          {getLessorTypeLabel(contract.lessor_type)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">计费模式：</span>
                        <span className="text-foreground ml-2">
                          {getBillingModelLabel(contract.billing_model)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">开始日期：</span>
                        <span className="text-foreground ml-2">
                          {new Date(contract.start_at).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">结束日期：</span>
                        <span className="text-foreground ml-2">
                          {new Date(contract.end_at).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 新建合同对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">新建租赁合同</DialogTitle>
            <DialogDescription className="text-slate-400">
              录入合同基本信息（不涉及金额计算）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 合同编号 */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                合同编号 <span className="text-red-400">*</span>
              </Label>
              <Input
                value={newContract.contract_no}
                onChange={(e) => setNewContract({ ...newContract, contract_no: e.target.value })}
                placeholder="请输入合同编号"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* 承租餐厅 */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                承租餐厅 <span className="text-red-400">*</span>
              </Label>
              <Select
                value={newContract.lessee_restaurant_id}
                onValueChange={(value) =>
                  setNewContract({ ...newContract, lessee_restaurant_id: value })
                }
              >
                <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="选择餐厅" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {restaurants.map((restaurant) => (
                    <SelectItem
                      key={restaurant.id}
                      value={restaurant.id}
                      className="text-white hover:bg-slate-700"
                    >
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 出租方类型 */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                出租方类型 <span className="text-red-400">*</span>
              </Label>
              <Select
                value={newContract.lessor_type}
                onValueChange={(value: any) =>
                  setNewContract({ ...newContract, lessor_type: value })
                }
              >
                <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="选择出租方类型" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="platform" className="text-white hover:bg-slate-700">
                    平台
                  </SelectItem>
                  <SelectItem value="manufacturer" className="text-white hover:bg-slate-700">
                    厂家
                  </SelectItem>
                  <SelectItem value="leasing_company" className="text-white hover:bg-slate-700">
                    租赁公司
                  </SelectItem>
                  <SelectItem value="finance_partner" className="text-white hover:bg-slate-700">
                    金融机构
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 出租方ID */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                出租方ID <span className="text-red-400">*</span>
              </Label>
              <Input
                value={newContract.lessor_id}
                onChange={(e) => setNewContract({ ...newContract, lessor_id: e.target.value })}
                placeholder="请输入出租方ID（UUID）"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* 开始日期 */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                开始日期 <span className="text-red-400">*</span>
              </Label>
              <Input
                type="date"
                value={newContract.start_at}
                onChange={(e) => setNewContract({ ...newContract, start_at: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* 结束日期 */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                结束日期 <span className="text-red-400">*</span>
              </Label>
              <Input
                type="date"
                value={newContract.end_at}
                onChange={(e) => setNewContract({ ...newContract, end_at: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* 计费模式 */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                计费模式 <span className="text-red-400">*</span>
              </Label>
              <Select
                value={newContract.billing_model}
                onValueChange={(value: any) =>
                  setNewContract({ ...newContract, billing_model: value })
                }
              >
                <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="选择计费模式" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="fixed" className="text-white hover:bg-slate-700">
                    固定费用
                  </SelectItem>
                  <SelectItem value="usage_based" className="text-white hover:bg-slate-700">
                    按使用量计费
                  </SelectItem>
                  <SelectItem value="hybrid" className="text-white hover:bg-slate-700">
                    混合模式
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 备注 */}
            <div className="space-y-2">
              <Label className="text-slate-300">备注</Label>
              <Textarea
                value={newContract.remark}
                onChange={(e) => setNewContract({ ...newContract, remark: e.target.value })}
                placeholder="可选，输入备注信息"
                className="bg-slate-800 border-slate-700 text-white"
                rows={3}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="border-slate-600/50 text-slate-300 hover:bg-slate-800/50"
              >
                取消
              </Button>
              <Button
                onClick={handleCreateContract}
                disabled={isCreating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
