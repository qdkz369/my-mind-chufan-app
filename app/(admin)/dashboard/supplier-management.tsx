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
import { logBusinessWarning } from "@/lib/utils/logger"
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
  user_count?: number // 已分配用户数量
  permissions_count?: number // 已分配功能权限数量
  fuel_types_count?: number // 已分配燃料品种数量
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
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false) // 独立的权限管理对话框
  const [showUserAssignment, setShowUserAssignment] = useState(true) // 控制是否显示用户分配部分
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
  
  // 权限分配状态
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]) // 选中的功能权限
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([]) // 选中的燃料品种
  
  // 所有可用的功能权限（对应菜单的 key）
  const availablePermissions = [
    { key: "dashboard", label: "工作台" },
    { key: "restaurants", label: "餐厅管理" },
    { key: "orders", label: "订单管理" },
    { key: "repairs", label: "报修管理" },
    { key: "equipmentRental", label: "设备租赁管理" },
    { key: "rentals", label: "租赁工作台" },
    { key: "productApproval", label: "产品审核" },
    { key: "devices", label: "设备监控" },
    { key: "workers", label: "工人管理" },
    { key: "fuelPricing", label: "燃料实时价格监控" },
    { key: "agreements", label: "协议管理" },
    { key: "api", label: "API配置" },
    { key: "analytics", label: "数据统计" },
    { key: "settings", label: "系统设置" },
  ]
  
  // 所有可用的燃料品种
  const availableFuelTypes = [
    { key: "lpg", label: "液化气" },
    { key: "clean", label: "热能清洁燃料" },
    { key: "alcohol", label: "醇基燃料" },
    { key: "outdoor", label: "户外环保燃料" },
  ]
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 加载公司列表（包含用户数量）
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
        logBusinessWarning('供应商管理', '加载失败', { code: error.code, message: error.message, hint: error.hint })
        
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
        
        // 为每个公司加载用户数量和权限信息
        const companiesWithUserCount = await Promise.all(
          (data || []).map(async (company) => {
            try {
              // 加载用户数量
              const { count: userCount, error: countError } = await supabase
                .from("user_companies")
                .select("*", { count: "exact", head: true })
                .eq("company_id", company.id)
              
              // 加载权限数量 - 使用 API 端点绕过 RLS
              let permCount = 0
              let fuelCount = 0
              try {
                const response = await fetch(`/api/admin/get-company-permissions?companyId=${company.id}`)
                const result = await response.json()
                if (result.success) {
                  permCount = result.permissionsCount || 0
                  fuelCount = result.fuelTypesCount || 0
                  console.log(`[供应商管理] ✅ 公司 ${company.name} 的权限数量: ${permCount}, 燃料品种数量: ${fuelCount}`)
                } else {
                  console.warn(`[供应商管理] ❌ 获取公司 ${company.name} (${company.id}) 的权限数量失败:`, result.error)
                }
              } catch (err) {
                console.warn(`[供应商管理] ❌ 获取公司 ${company.name} (${company.id}) 的权限数量异常:`, err)
              }
              
              if (countError) {
                console.warn(`[供应商管理] ❌ 获取公司 ${company.name} 的用户数量失败:`, countError)
              }
              
              const result = { 
                ...company, 
                user_count: userCount || 0,
                permissions_count: permCount || 0,
                fuel_types_count: fuelCount || 0
              }
              
              console.log(`[供应商管理] 📊 公司 ${company.name} 统计信息:`, {
                users: result.user_count,
                permissions: result.permissions_count,
                fuelTypes: result.fuel_types_count
              })
              
              return result
            } catch (err) {
              console.warn(`[供应商管理] 获取公司 ${company.name} 的信息异常:`, err)
              return { 
                ...company, 
                user_count: 0,
                permissions_count: 0,
                fuel_types_count: 0
              }
            }
          })
        )
        
        console.log("[供应商管理] 公司列表（含用户数量）:", companiesWithUserCount)
        setCompanies(companiesWithUserCount)
        setFilteredCompanies(companiesWithUserCount)
      }
    } catch (error: any) {
      logBusinessWarning('供应商管理', '加载异常', error)
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
        logBusinessWarning('供应商管理', '创建失败', result)
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
      logBusinessWarning('供应商管理', '创建失败', error)
      alert(`创建失败: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 加载公司用户列表
  const loadCompanyUsers = useCallback(async (companyId: string) => {
    try {
      if (!supabase) return

      // 先查询 user_companies 表
      const { data: userCompanies, error: ucError } = await supabase
        .from("user_companies")
        .select("*")
        .eq("company_id", companyId)
        .order("is_primary", { ascending: false })

      if (ucError) {
        logBusinessWarning('供应商管理', '加载用户关联失败', ucError)
        setCompanyUsers([])
        return
      }

      if (!userCompanies || userCompanies.length === 0) {
        setCompanyUsers([])
        return
      }

      // 通过 API 获取用户信息（邮箱、手机号）
      const userIds = userCompanies.map(uc => uc.user_id).filter(Boolean)
      const usersMap = new Map<string, { id: string; email?: string; phone?: string }>()

      if (userIds.length > 0) {
        try {
          // 调用 API 获取用户信息
          const response = await fetch("/api/admin/get-users-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userIds }),
          })

          const result = await response.json()

          if (result.success && result.users) {
            // 将 API 返回的用户信息存入 Map
            Object.entries(result.users).forEach(([userId, userInfo]: [string, any]) => {
              usersMap.set(userId, {
                id: userId,
                email: userInfo.email,
                phone: userInfo.phone,
              })
            })
          } else {
            console.warn("[供应商管理] 获取用户信息失败:", result.error)
          }
        } catch (err) {
          console.warn("[供应商管理] 获取用户信息异常:", err)
        }
      }

      // 组合数据
      const companyUsersWithUsers = userCompanies.map(uc => ({
        ...uc,
        users: usersMap.get(uc.user_id) || { id: uc.user_id }
      }))

      setCompanyUsers(companyUsersWithUsers)
    } catch (error) {
      logBusinessWarning('供应商管理', '加载用户异常', error)
      setCompanyUsers([])
    }
  }, [supabase])

  // 打开分配用户对话框
  const handleOpenAssignUserDialog = (company: Company) => {
    // 如果切换了公司，先清空权限状态
    if (selectedCompany && selectedCompany.id !== company.id) {
      setSelectedPermissions([])
      setSelectedFuelTypes([])
    }
    
    setSelectedCompany(company)
    setShowUserAssignment(true) // 显示用户分配部分
    setIsAssignUserDialogOpen(true)
    loadCompanyUsers(company.id)
    
    // 加载该公司的现有权限（异步加载，确保数据正确）
    loadCompanyPermissions(company.id).then(() => {
      console.log(`[供应商管理] 已加载公司 ${company.name} 的权限信息`)
    }).catch((err) => {
      console.error(`[供应商管理] 加载权限失败:`, err)
    })
  }

  // 打开权限管理对话框（不显示用户分配部分）
  const handleOpenPermissionsDialog = async (company: Company) => {
    // 如果切换了公司，先清空权限状态
    if (selectedCompany && selectedCompany.id !== company.id) {
      setSelectedPermissions([])
      setSelectedFuelTypes([])
    }
    
    setSelectedCompany(company)
    
    // 先加载权限，再打开对话框，确保数据已加载
    console.log(`[供应商管理] 开始加载公司 ${company.name} (ID: ${company.id}) 的权限信息...`)
    try {
      await loadCompanyPermissions(company.id)
      console.log(`[供应商管理] ✅ 已加载公司 ${company.name} 的权限信息:`, {
        permissions: selectedPermissions.length,
        fuelTypes: selectedFuelTypes.length
      })
    } catch (err) {
      console.error(`[供应商管理] ❌ 加载权限失败:`, err)
      // 即使加载失败也打开对话框，但显示空状态
      setSelectedPermissions([])
      setSelectedFuelTypes([])
    }
    
    // 等待权限加载完成后再打开对话框
    setIsPermissionsDialogOpen(true)
  }
  
  // 加载公司权限 - 使用 API 端点绕过 RLS
  const loadCompanyPermissions = useCallback(async (companyId: string) => {
    try {
      console.log(`[供应商管理] 查询公司权限: company_id = ${companyId}`)

      // 使用 API 端点查询权限，绕过 RLS 限制
      const response = await fetch(`/api/admin/get-company-permissions?companyId=${companyId}`)
      const result = await response.json()

      if (!result.success) {
        console.error("[供应商管理] ❌ 加载权限失败:", result.error)
        setSelectedPermissions([])
        setSelectedFuelTypes([])
        return
      }

      const permissions = result.permissions || []
      const fuelTypes = result.fuelTypes || []

      console.log(`[供应商管理] ✅ 加载到 ${permissions.length} 个功能权限:`, permissions)
      console.log(`[供应商管理] ✅ 加载到 ${fuelTypes.length} 个燃料品种:`, fuelTypes)

      setSelectedPermissions(permissions)
      setSelectedFuelTypes(fuelTypes)
    } catch (error) {
      console.error("[供应商管理] ❌ 加载权限异常:", error)
      logBusinessWarning('供应商管理', '加载权限异常', error)
      setSelectedPermissions([])
      setSelectedFuelTypes([])
    }
  }, [])

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

      // 1. 先尝试查找用户，如果不存在则创建
      let userId: string | null = null
      let isNewUser = false

      // 先尝试查找用户
      const findResponse = await fetch("/api/admin/find-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: assignUserForm.user_email }),
      })

      const findResult = await findResponse.json()

      if (findResult.success && findResult.userId) {
        // 用户已存在
        userId = findResult.userId
        console.log(`[供应商管理] 用户已存在: ${assignUserForm.user_email}`)
      } else {
        // 用户不存在，创建新用户（默认密码：123456）
        console.log(`[供应商管理] 用户不存在，创建新用户: ${assignUserForm.user_email}`)
        const createResponse = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: assignUserForm.user_email,
            password: "123456" // 默认密码
          }),
        })

        const createResult = await createResponse.json()

        if (!createResult.success || !createResult.userId) {
          alert(`创建用户失败: ${createResult.error || "未知错误"}`)
          return
        }

        userId = createResult.userId
        isNewUser = true
        console.log(`[供应商管理] 新用户创建成功: ${assignUserForm.user_email}, 默认密码：123456`)
      }

      if (!userId) {
        alert("无法获取用户ID，请重试")
        return
      }

      // 2. 检查是否已经关联（更详细的检查）
      const { data: existing, error: checkError } = await supabase
        .from("user_companies")
        .select("id, role, is_primary")
        .eq("user_id", userId)
        .eq("company_id", selectedCompany.id)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 是"未找到记录"的错误，这是正常的
        console.warn("[供应商管理] 检查用户关联时出错:", checkError)
      }

      if (existing) {
        const roleText = existing.role === 'owner' ? '所有者' : existing.role === 'admin' ? '管理员' : '成员'
        const primaryText = existing.is_primary ? '（主公司）' : ''
        alert(`⚠️ 该用户已经关联到此公司\n\n当前角色：${roleText}${primaryText}\n\n如需修改角色，请先移除该用户，然后重新分配。`)
        setIsSubmitting(false)
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
        const successMessage = isNewUser 
          ? `✅ 用户创建并分配成功！\n\n邮箱：${assignUserForm.user_email}\n默认密码：123456\n角色：${assignUserForm.role === 'owner' ? '所有者' : assignUserForm.role === 'admin' ? '管理员' : '成员'}\n${assignUserForm.is_primary ? '已设为主公司' : ''}\n\n请提醒用户首次登录后修改密码。`
          : `✅ 用户分配成功！\n\n邮箱：${assignUserForm.user_email}\n角色：${assignUserForm.role === 'owner' ? '所有者' : assignUserForm.role === 'admin' ? '管理员' : '成员'}\n${assignUserForm.is_primary ? '已设为主公司' : ''}`
        alert(successMessage)
        setAssignUserForm({
          user_email: "",
          role: "member",
          is_primary: false,
        })
        await loadCompanyUsers(selectedCompany.id)
        // 重新加载公司列表以更新用户数量
        await loadCompanies()
        
        // 保存权限（如果选择了权限）
        if (selectedPermissions.length > 0 || selectedFuelTypes.length > 0) {
          try {
            const savePermissionsResponse = await fetch("/api/admin/update-company-permissions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                companyId: selectedCompany.id,
                permissions: selectedPermissions,
                fuelTypes: selectedFuelTypes,
              }),
            })

            const savePermissionsResult = await savePermissionsResponse.json()

            if (savePermissionsResult.success) {
              console.log(`[供应商管理] 权限已保存: ${selectedPermissions.length} 个功能模块, ${selectedFuelTypes.length} 个燃料品种`)
            } else {
              console.warn("[供应商管理] 保存权限失败:", savePermissionsResult.error)
            }
          } catch (error: any) {
            console.warn("[供应商管理] 保存权限异常:", error)
          }
        }
      }
    } catch (error: any) {
      logBusinessWarning('供应商管理', '分配用户失败', error)
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
      logBusinessWarning('供应商管理', '删除用户失败', error)
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
      logBusinessWarning('供应商管理', '更新状态失败', error)
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
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {getStatusBadge(company.status)}
                      {/* 显示已分配用户数量 */}
                      {company.user_count !== undefined && company.user_count > 0 && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>已分配 {company.user_count} 人</span>
                        </Badge>
                      )}
                      {company.user_count === 0 && (
                        <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>未分配</span>
                        </Badge>
                      )}
                    </div>
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

                {/* 显示已分配的权限信息 */}
                {(company.permissions_count && company.permissions_count > 0) || (company.fuel_types_count && company.fuel_types_count > 0) ? (
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-700">
                    <div className="flex items-center gap-2 flex-wrap">
                      {company.permissions_count && company.permissions_count > 0 && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>功能权限: {company.permissions_count} 项</span>
                        </Badge>
                      )}
                      {company.fuel_types_count && company.fuel_types_count > 0 && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>燃料品种: {company.fuel_types_count} 种</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-700">
                    <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                      未配置主营业务
                    </Badge>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-700">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAssignUserDialog(company)}
                    className={`flex-1 ${
                      company.user_count && company.user_count > 0 
                        ? 'border-green-500/50 text-green-400 hover:bg-green-500/10' 
                        : 'border-blue-500/50 text-blue-400 hover:bg-blue-500/10'
                    }`}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    {company.user_count && company.user_count > 0 ? `已分配 (${company.user_count})` : '分配用户'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPermissionsDialog(company)}
                    className={`flex-1 ${
                      (company.permissions_count && company.permissions_count > 0) || (company.fuel_types_count && company.fuel_types_count > 0)
                        ? 'border-purple-500/50 text-purple-400 hover:bg-purple-500/10' 
                        : 'border-slate-500/50 text-slate-400 hover:bg-slate-500/10'
                    }`}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {(company.permissions_count && company.permissions_count > 0) || (company.fuel_types_count && company.fuel_types_count > 0) ? '管理权限' : '配置权限'}
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
      <Dialog open={isAssignUserDialogOpen} onOpenChange={(open) => {
        setIsAssignUserDialogOpen(open)
        // 对话框关闭时不清空权限，保持状态以便下次打开时正确显示
        // 只在真正需要重置时才清空（例如切换到其他公司时）
        if (!open && selectedCompany) {
          // 对话框关闭时，可以保留权限状态，这样下次打开同一公司时会更快显示
          // 如果需要清空，可以在切换公司时清空
        }
      }}>
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
            {/* 分配新用户 - 只在 showUserAssignment 为 true 时显示 */}
            {showUserAssignment && (
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
            )}

            {/* 已分配用户列表 - 只在 showUserAssignment 为 true 时显示 */}
            {showUserAssignment && (
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
                              {uc.users?.email || uc.users?.phone || `用户ID: ${uc.user_id.slice(0, 8)}...`}
                            </p>
                            {uc.users?.email && uc.users?.phone && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {uc.users.email} / {uc.users.phone}
                              </p>
                            )}
                            {uc.users?.email && !uc.users?.phone && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                邮箱: {uc.users.email}
                              </p>
                            )}
                            {!uc.users?.email && uc.users?.phone && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                手机: {uc.users.phone}
                              </p>
                            )}
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
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 独立的权限管理对话框 */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">
              管理权限 - {selectedCompany?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              配置该供应商可以访问的功能模块和可供应的燃料品种
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* 主营业务权限配置 */}
            <Card className="bg-slate-800/50 border-slate-700" data-permissions-card>
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  主营业务权限配置
                  {(selectedPermissions.length > 0 || selectedFuelTypes.length > 0) && (
                    <span className="ml-2 text-sm text-slate-400 font-normal">
                      （已配置 {selectedPermissions.length} 项功能，{selectedFuelTypes.length} 种燃料）
                    </span>
                  )}
                </CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  配置该供应商可以访问的功能模块和可供应的燃料品种。支持勾选/取消勾选进行修改。
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 功能权限选择 */}
                <div>
                  <Label className="text-slate-300 mb-3 block">功能模块权限</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-700/30 rounded-lg">
                    {availablePermissions.map((permission) => (
                      <label
                        key={permission.key}
                        className="flex items-center gap-2 p-2 rounded hover:bg-slate-700/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissions([...selectedPermissions, permission.key])
                            } else {
                              setSelectedPermissions(selectedPermissions.filter(p => p !== permission.key))
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                        />
                        <span className="text-slate-300 text-sm">{permission.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    已选择 {selectedPermissions.length} 个功能模块
                  </p>
                </div>

                {/* 燃料品种选择 */}
                <div>
                  <Label className="text-slate-300 mb-3 block">可供应燃料品种</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {availableFuelTypes.map((fuelType) => (
                      <label
                        key={fuelType.key}
                        className="flex items-center gap-2 p-2 rounded hover:bg-slate-700/50 cursor-pointer bg-slate-700/30"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFuelTypes.includes(fuelType.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFuelTypes([...selectedFuelTypes, fuelType.key])
                            } else {
                              setSelectedFuelTypes(selectedFuelTypes.filter(f => f !== fuelType.key))
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                        />
                        <span className="text-slate-300 text-sm">{fuelType.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    已选择 {selectedFuelTypes.length} 个燃料品种
                  </p>
                </div>

                {/* 保存权限按钮 */}
                <Button
                  onClick={async () => {
                    if (!selectedCompany) return
                    try {
                      const saveResponse = await fetch("/api/admin/update-company-permissions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          companyId: selectedCompany.id,
                          permissions: selectedPermissions,
                          fuelTypes: selectedFuelTypes,
                        }),
                      })

                      const saveResult = await saveResponse.json()

                      if (saveResult.success) {
                        alert(`✅ 权限保存成功！\n\n功能模块：${selectedPermissions.length} 个\n燃料品种：${selectedFuelTypes.length} 个`)
                        console.log(`[供应商管理] ✅ 权限已保存: ${selectedPermissions.length} 个功能模块, ${selectedFuelTypes.length} 个燃料品种`)
                        // 刷新公司列表以更新权限数量
                        console.log(`[供应商管理] 刷新公司列表以更新权限数量...`)
                        await loadCompanies()
                        console.log(`[供应商管理] ✅ 公司列表已刷新`)
                        // 重新加载当前公司的权限以确保状态同步
                        if (selectedCompany) {
                          console.log(`[供应商管理] 重新加载公司 ${selectedCompany.name} 的权限...`)
                          await loadCompanyPermissions(selectedCompany.id)
                        }
                        // 关闭对话框
                        setIsPermissionsDialogOpen(false)
                      } else {
                        alert(`保存权限失败: ${saveResult.error || "未知错误"}`)
                        console.warn("[供应商管理] 保存权限失败:", saveResult.error)
                      }
                    } catch (error: any) {
                      alert(`保存权限失败: ${error.message || "未知错误"}`)
                      console.warn("[供应商管理] 保存权限异常:", error)
                      logBusinessWarning('供应商管理', '保存权限异常', error)
                    }
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  保存主营业务权限
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

