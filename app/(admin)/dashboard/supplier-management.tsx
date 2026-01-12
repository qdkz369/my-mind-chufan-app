"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  UserPlus,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Company {
  id: string
  name: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  business_license?: string
  status: string
  created_at: string
}

interface UserCompany {
  id: string
  user_id: string
  company_id: string
  role: string
  is_primary: boolean
  users?: {
    id: string
    email?: string
  }
}

export function SupplierManagement() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // 对话框状态
  const [isCreateCompanyDialogOpen, setIsCreateCompanyDialogOpen] = useState(false)
  const [isAssignUserDialogOpen, setIsAssignUserDialogOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [companyUsers, setCompanyUsers] = useState<UserCompany[]>([])
  
  // 表单状态
  const [newCompany, setNewCompany] = useState({
    name: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    address: "",
    business_license: "",
    status: "active",
  })
  
  const [assignUserForm, setAssignUserForm] = useState({
    user_email: "",
    role: "member",
    is_primary: false,
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 加载公司列表
  const loadCompanies = useCallback(async () => {
    setIsLoading(true)
    try {
      if (!supabase) {
        console.error("[供应商管理] Supabase 未初始化")
        return
      }

      console.log("[供应商管理] 开始加载公司列表...")
      
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[供应商管理] 加载失败:", error)
        console.error("[供应商管理] 错误代码:", error.code)
        console.error("[供应商管理] 错误详情:", error.message)
        console.error("[供应商管理] 错误提示:", error.hint)
        
        // 如果是 RLS 错误，提供更详细的提示
        if (error.code === "42501" || error.code === "PGRST301") {
          alert(`加载失败: 权限不足。请检查 companies 表的 RLS 策略设置。\n错误: ${error.message}`)
        } else {
          alert(`加载失败: ${error.message}`)
        }
        // 即使出错也设置空数组，避免显示加载状态
        setCompanies([])
        setFilteredCompanies([])
      } else {
        console.log("[供应商管理] 加载成功，公司数量:", data?.length || 0)
        console.log("[供应商管理] 公司列表:", data)
        setCompanies(data || [])
        setFilteredCompanies(data || [])
      }
    } catch (error: any) {
      console.error("[供应商管理] 加载异常:", error)
      alert(`加载异常: ${error.message}`)
      setCompanies([])
      setFilteredCompanies([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  // 搜索和筛选
  useEffect(() => {
    let filtered = [...companies]

    // 状态筛选
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter)
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((item) => {
        return (
          item.name.toLowerCase().includes(query) ||
          item.contact_name?.toLowerCase().includes(query) ||
          item.contact_phone?.includes(query) ||
          item.contact_email?.toLowerCase().includes(query)
        )
      })
    }

    setFilteredCompanies(filtered)
  }, [searchQuery, statusFilter, companies])

  // 创建公司
  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) {
      alert("请输入公司名称")
      return
    }

    setIsSubmitting(true)
    try {
      if (!supabase) {
        alert("Supabase 未初始化，请刷新页面重试")
        return
      }
      
      // 获取当前用户ID
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || null

      // 使用 API 路由创建公司，避免 RLS 问题
      // 注意：API 路由会从 cookies 中读取用户信息，不需要手动传递 Authorization header
      const response = await fetch("/api/admin/create-company", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include", // 确保 cookies 被发送
        body: JSON.stringify({
          name: newCompany.name,
          contact_name: newCompany.contact_name || null,
          contact_phone: newCompany.contact_phone || null,
          contact_email: newCompany.contact_email || null,
          address: newCompany.address || null,
          business_license: newCompany.business_license || null,
          status: newCompany.status,
          user_id: userId, // 传递用户ID，用于自动创建关联记录（API 会验证实际登录用户）
        }),
      })

      const result = await response.json()

      if (!result.success) {
        alert(`创建失败: ${result.error || result.details || "未知错误"}`)
        console.error("[供应商管理] 创建失败:", result)
      } else {
        console.log("[供应商管理] 创建成功，返回数据:", result.data)
        alert("公司创建成功！正在刷新列表...")
        setIsCreateCompanyDialogOpen(false)
        setNewCompany({
          name: "",
          contact_name: "",
          contact_phone: "",
          contact_email: "",
          address: "",
          business_license: "",
          status: "active",
        })
        // 延迟一小段时间后刷新，确保数据库已提交
        setTimeout(async () => {
          console.log("[供应商管理] 开始刷新公司列表...")
          await loadCompanies()
        }, 500)
      }
    } catch (error: any) {
      console.error("[供应商管理] 创建失败:", error)
      alert(`创建失败: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 加载公司用户列表
  const loadCompanyUsers = useCallback(async (companyId: string) => {
    try {
      if (!supabase) return

      const { data, error } = await supabase
        .from("user_companies")
        .select(`
          *,
          users:user_id (
            id,
            email
          )
        `)
        .eq("company_id", companyId)
        .order("is_primary", { ascending: false })

      if (error) {
        console.error("[供应商管理] 加载用户失败:", error)
      } else {
        setCompanyUsers(data || [])
      }
    } catch (error) {
      console.error("[供应商管理] 加载用户异常:", error)
    }
  }, [])

  // 打开分配用户对话框
  const handleOpenAssignUserDialog = (company: Company) => {
    setSelectedCompany(company)
    setIsAssignUserDialogOpen(true)
    loadCompanyUsers(company.id)
  }

  // 分配用户到公司
  const handleAssignUser = async () => {
    if (!assignUserForm.user_email.trim()) {
      alert("请输入用户邮箱")
      return
    }

    if (!selectedCompany) {
      alert("请选择公司")
      return
    }

    setIsSubmitting(true)
    try {
      if (!supabase) return

      // 1. 通过邮箱查找用户（使用 Supabase Auth Admin API）
      // 注意：需要使用 Service Role Key 才能访问 auth.users
      const response = await fetch("/api/admin/find-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: assignUserForm.user_email }),
      })

      const result = await response.json()

      if (!result.success || !result.userId) {
        alert(`未找到邮箱为 ${assignUserForm.user_email} 的用户。请确保用户已注册。`)
        return
      }

      const userId = result.userId

      // 2. 检查是否已经关联
      const { data: existing } = await supabase
        .from("user_companies")
        .select("id")
        .eq("user_id", userId)
        .eq("company_id", selectedCompany.id)
        .single()

      if (existing) {
        alert("该用户已经关联到此公司")
        return
      }

      // 3. 如果设置为主公司，先取消其他主公司标记
      if (assignUserForm.is_primary) {
        await supabase
          .from("user_companies")
          .update({ is_primary: false })
          .eq("user_id", userId)
      }

      // 4. 创建关联
      const { error: assignError } = await supabase
        .from("user_companies")
        .insert({
          user_id: userId,
          company_id: selectedCompany.id,
          role: assignUserForm.role,
          is_primary: assignUserForm.is_primary,
        })

      if (assignError) {
        alert(`分配失败: ${assignError.message}`)
      } else {
        alert("用户分配成功！")
        setAssignUserForm({
          user_email: "",
          role: "member",
          is_primary: false,
        })
        await loadCompanyUsers(selectedCompany.id)
      }
    } catch (error: any) {
      console.error("[供应商管理] 分配用户失败:", error)
      alert(`分配失败: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 删除用户关联
  const handleRemoveUser = async (userCompanyId: string) => {
    if (!confirm("确定要移除该用户吗？")) return

    try {
      if (!supabase) return

      const { error } = await supabase
        .from("user_companies")
        .delete()
        .eq("id", userCompanyId)

      if (error) {
        alert(`删除失败: ${error.message}`)
      } else {
        alert("用户已移除")
        if (selectedCompany) {
          await loadCompanyUsers(selectedCompany.id)
        }
      }
    } catch (error: any) {
      console.error("[供应商管理] 删除用户失败:", error)
      alert(`删除失败: ${error.message}`)
    }
  }

  // 更新公司状态
  const handleUpdateCompanyStatus = async (companyId: string, newStatus: string) => {
    try {
      if (!supabase) return

      const { error } = await supabase
        .from("companies")
        .update({ status: newStatus })
        .eq("id", companyId)

      if (error) {
        alert(`更新失败: ${error.message}`)
      } else {
        await loadCompanies()
      }
    } catch (error: any) {
      console.error("[供应商管理] 更新状态失败:", error)
      alert(`更新失败: ${error.message}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            激活
          </Badge>
        )
      case "inactive":
        return (
          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
            停用
          </Badge>
        )
      case "suspended":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            暂停
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">供应商管理</h1>
          <p className="text-slate-400">创建和管理供应商公司账号</p>
        </div>
        <Button
          onClick={() => setIsCreateCompanyDialogOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          <Plus className="h-4 w-4 mr-2" />
          创建供应商
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="搜索公司名称、联系人、电话..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">激活</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
                <SelectItem value="suspended">暂停</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 公司列表 */}
      {isLoading ? (
        <div className="text-center py-20">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">加载中...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Building2 className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">暂无供应商</p>
            <Button
              onClick={() => setIsCreateCompanyDialogOpen(true)}
              className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建第一个供应商
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => (
            <Card
              key={company.id}
              className="bg-slate-800/50 border-slate-700/50 hover:border-blue-500/50 transition-all"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg mb-2">{company.name}</CardTitle>
                    {getStatusBadge(company.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {company.contact_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-300">{company.contact_name}</span>
                  </div>
                )}
                {company.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">电话:</span>
                    <span className="text-slate-300">{company.contact_phone}</span>
                  </div>
                )}
                {company.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">邮箱:</span>
                    <span className="text-slate-300">{company.contact_email}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-700">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAssignUserDialog(company)}
                    className="flex-1 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    分配用户
                  </Button>
                  <Select
                    value={company.status}
                    onValueChange={(value) => handleUpdateCompanyStatus(company.id, value)}
                  >
                    <SelectTrigger className="flex-1 bg-slate-700 border-slate-600 text-white text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">激活</SelectItem>
                      <SelectItem value="inactive">停用</SelectItem>
                      <SelectItem value="suspended">暂停</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 创建公司对话框 */}
      <Dialog open={isCreateCompanyDialogOpen} onOpenChange={setIsCreateCompanyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">创建供应商公司</DialogTitle>
            <DialogDescription className="text-slate-400">
              填写公司信息，创建后可以分配用户账号
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300 mb-2 block">公司名称 *</Label>
              <Input
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                placeholder="例如：XX设备租赁有限公司"
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 mb-2 block">联系人</Label>
                <Input
                  value={newCompany.contact_name}
                  onChange={(e) => setNewCompany({ ...newCompany, contact_name: e.target.value })}
                  placeholder="联系人姓名"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">联系电话</Label>
                <Input
                  value={newCompany.contact_phone}
                  onChange={(e) => setNewCompany({ ...newCompany, contact_phone: e.target.value })}
                  placeholder="联系电话"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block">联系邮箱</Label>
              <Input
                type="email"
                value={newCompany.contact_email}
                onChange={(e) => setNewCompany({ ...newCompany, contact_email: e.target.value })}
                placeholder="contact@example.com"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block">公司地址</Label>
              <Textarea
                value={newCompany.address}
                onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                placeholder="公司详细地址"
                className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block">营业执照号</Label>
              <Input
                value={newCompany.business_license}
                onChange={(e) => setNewCompany({ ...newCompany, business_license: e.target.value })}
                placeholder="营业执照号（可选）"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block">状态</Label>
              <Select
                value={newCompany.status}
                onValueChange={(value) => setNewCompany({ ...newCompany, status: value })}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">激活</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                  <SelectItem value="suspended">暂停</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="ghost"
                onClick={() => setIsCreateCompanyDialogOpen(false)}
                className="flex-1 text-slate-400 hover:text-white"
              >
                取消
              </Button>
              <Button
                onClick={handleCreateCompany}
                disabled={isSubmitting || !newCompany.name.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    创建公司
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 分配用户对话框 */}
      <Dialog open={isAssignUserDialogOpen} onOpenChange={setIsAssignUserDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">
              分配用户 - {selectedCompany?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              将用户账号关联到此供应商公司
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* 分配新用户 */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">分配新用户</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300 mb-2 block">用户邮箱 *</Label>
                  <Input
                    type="email"
                    value={assignUserForm.user_email}
                    onChange={(e) =>
                      setAssignUserForm({ ...assignUserForm, user_email: e.target.value })
                    }
                    placeholder="user@example.com"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    请输入已注册用户的邮箱地址
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300 mb-2 block">角色</Label>
                    <Select
                      value={assignUserForm.role}
                      onValueChange={(value) =>
                        setAssignUserForm({ ...assignUserForm, role: value })
                      }
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">成员</SelectItem>
                        <SelectItem value="admin">管理员</SelectItem>
                        <SelectItem value="owner">所有者</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignUserForm.is_primary}
                        onChange={(e) =>
                          setAssignUserForm({ ...assignUserForm, is_primary: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                      />
                      <span className="text-slate-300 text-sm">设为主公司</span>
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleAssignUser}
                  disabled={isSubmitting || !assignUserForm.user_email.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      分配中...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      分配用户
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 已分配用户列表 */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">已分配用户</CardTitle>
              </CardHeader>
              <CardContent>
                {companyUsers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                    <p>暂无用户</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {companyUsers.map((uc) => (
                      <div
                        key={uc.id}
                        className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-white font-medium">
                              {uc.users?.email || uc.user_id}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                className={
                                  uc.role === "owner"
                                    ? "bg-purple-500/20 text-purple-400"
                                    : uc.role === "admin"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-slate-500/20 text-slate-400"
                                }
                              >
                                {uc.role === "owner"
                                  ? "所有者"
                                  : uc.role === "admin"
                                  ? "管理员"
                                  : "成员"}
                              </Badge>
                              {uc.is_primary && (
                                <Badge className="bg-yellow-500/20 text-yellow-400">
                                  主公司
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveUser(uc.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

