"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Building2, Loader2 } from "lucide-react"
import { logBusinessWarning } from "@/lib/utils/logger"
import { supabase } from "@/lib/supabase"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import type { Company, UserCompany } from "./components/supplier-management-types"
import { SupplierSearchFilter } from "./components/supplier-search-filter"
import { SupplierCompanyCard } from "./components/supplier-company-card"
import { getSupplierStatusBadge } from "./components/supplier-status-badge"
import { SupplierCreateCompanyDialog } from "./components/supplier-create-company-dialog"
import { SupplierAssignUserDialog } from "./components/supplier-assign-user-dialog"
import { SupplierPermissionsDialog } from "./components/supplier-permissions-dialog"

const INITIAL_COMPANY_FORM = {
  name: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  address: "",
  business_license: "",
  status: "active",
}

const INITIAL_ASSIGN_FORM = {
  user_email: "",
  role: "member",
  is_primary: false,
}

export function SupplierManagement() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [isCreateCompanyDialogOpen, setIsCreateCompanyDialogOpen] = useState(false)
  const [isAssignUserDialogOpen, setIsAssignUserDialogOpen] = useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [companyUsers, setCompanyUsers] = useState<UserCompany[]>([])

  const [newCompany, setNewCompany] = useState(INITIAL_COMPANY_FORM)
  const [assignUserForm, setAssignUserForm] = useState(INITIAL_ASSIGN_FORM)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadCompanies = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetchWithAuth("/api/admin/companies", {
        credentials: "include",
      })
      const result = await response.json()

      if (!result.success) {
        logBusinessWarning("供应商管理", "加载失败", result)
        if (result.error?.includes("未授权") || response.status === 401) {
          alert("加载失败: 请先登录")
        } else {
          alert(`加载失败: ${result.error || result.details || "未知错误"}`)
        }
        setCompanies([])
        setFilteredCompanies([])
        return
      }

      const data = result.data || []
      setCompanies(data)
      setFilteredCompanies(data)
    } catch (error: any) {
      logBusinessWarning("供应商管理", "加载异常", error)
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

  useEffect(() => {
    let filtered = [...companies]
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.contact_name?.toLowerCase().includes(q) ||
          item.contact_phone?.includes(q) ||
          item.contact_email?.toLowerCase().includes(q)
      )
    }
    setFilteredCompanies(filtered)
  }, [searchQuery, statusFilter, companies])

  const loadCompanyPermissions = useCallback(
    async (companyId: string): Promise<{ permissions: string[]; fuelTypes: string[] }> => {
      const response = await fetchWithAuth(
        `/api/admin/get-company-permissions?companyId=${companyId}`,
        { credentials: "include" }
      )
      const result = await response.json()
      if (!result.success) {
        return { permissions: [], fuelTypes: [] }
      }
      return {
        permissions: result.permissions || [],
        fuelTypes: result.fuelTypes || [],
      }
    },
    []
  )

  const loadCompanyUsers = useCallback(async (companyId: string) => {
    if (!supabase) return
    try {
      const { data: userCompanies, error: ucError } = await supabase
        .from("user_companies")
        .select("*")
        .eq("company_id", companyId)
        .order("is_primary", { ascending: false })

      if (ucError || !userCompanies?.length) {
        setCompanyUsers([])
        return
      }

      const userIds = userCompanies.map((uc) => uc.user_id).filter(Boolean)
      const usersMap = new Map<string, { id: string; email?: string; phone?: string }>()

      if (userIds.length > 0) {
        const response = await fetchWithAuth("/api/admin/get-users-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
          credentials: "include",
        })
        const result = await response.json()
        if (result.success && result.users) {
          Object.entries(result.users).forEach(([userId, userInfo]: [string, any]) => {
            usersMap.set(userId, {
              id: userId,
              email: userInfo.email,
              phone: userInfo.phone,
            })
          })
        }
      }

      setCompanyUsers(
        userCompanies.map((uc) => ({
          ...uc,
          users: usersMap.get(uc.user_id) || { id: uc.user_id },
        }))
      )
    } catch (error) {
      logBusinessWarning("供应商管理", "加载用户异常", error)
      setCompanyUsers([])
    }
  }, [])

  const handleOpenAssignUserDialog = (company: Company) => {
    if (selectedCompany?.id !== company.id) {
      setSelectedPermissions([])
      setSelectedFuelTypes([])
    }
    setSelectedCompany(company)
    setIsAssignUserDialogOpen(true)
    loadCompanyUsers(company.id)
    loadCompanyPermissions(company.id).then(({ permissions, fuelTypes }) => {
      setSelectedPermissions(permissions)
      setSelectedFuelTypes(fuelTypes)
    })
  }

  const handleOpenPermissionsDialog = async (company: Company) => {
    if (selectedCompany?.id !== company.id) {
      setSelectedPermissions([])
      setSelectedFuelTypes([])
    }
    setSelectedCompany(company)
    const { permissions, fuelTypes } = await loadCompanyPermissions(company.id)
    setSelectedPermissions(permissions)
    setSelectedFuelTypes(fuelTypes)
    setIsPermissionsDialogOpen(true)
  }

  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) {
      alert("请输入公司名称")
      return
    }
    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const response = await fetchWithAuth("/api/admin/create-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newCompany.name,
          contact_name: newCompany.contact_name || null,
          contact_phone: newCompany.contact_phone || null,
          contact_email: newCompany.contact_email || null,
          address: newCompany.address || null,
          business_license: newCompany.business_license || null,
          status: newCompany.status,
          user_id: user?.id ?? null,
        }),
      })

      const result = await response.json()
      if (!result.success) {
        alert(`创建失败: ${result.error || result.details || "未知错误"}`)
        return
      }
      alert("公司创建成功！正在刷新列表...")
      setIsCreateCompanyDialogOpen(false)
      setNewCompany(INITIAL_COMPANY_FORM)
      setTimeout(() => loadCompanies(), 500)
    } catch (error: any) {
      logBusinessWarning("供应商管理", "创建失败", error)
      alert(`创建失败: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAssignUser = async () => {
    if (!assignUserForm.user_email.trim() || !selectedCompany) {
      alert("请输入用户邮箱")
      return
    }
    setIsSubmitting(true)
    try {
      let userId: string | null = null
      let isNewUser = false

      const findResponse = await fetchWithAuth("/api/admin/find-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: assignUserForm.user_email }),
      })
      const findResult = await findResponse.json()

      if (findResult.success && findResult.userId) {
        userId = findResult.userId
      } else {
        const createResponse = await fetchWithAuth("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: assignUserForm.user_email,
            password: "123456",
          }),
        })
        const createResult = await createResponse.json()
        if (!createResult.success || !createResult.userId) {
          alert(`创建用户失败: ${createResult.error || "未知错误"}`)
          setIsSubmitting(false)
          return
        }
        userId = createResult.userId
        isNewUser = true
      }

      if (!userId || !supabase) {
        alert("无法获取用户ID，请重试")
        setIsSubmitting(false)
        return
      }

      const { data: existing } = await supabase
        .from("user_companies")
        .select("id, role, is_primary")
        .eq("user_id", userId)
        .eq("company_id", selectedCompany.id)
        .maybeSingle()

      if (existing) {
        const roleText =
          existing.role === "owner" ? "所有者" : existing.role === "admin" ? "管理员" : "成员"
        const primaryText = existing.is_primary ? "（主公司）" : ""
        alert(
          `⚠️ 该用户已经关联到此公司\n\n当前角色：${roleText}${primaryText}\n\n如需修改角色，请先移除该用户，然后重新分配。`
        )
        setIsSubmitting(false)
        return
      }

      if (assignUserForm.is_primary) {
        await supabase
          .from("user_companies")
          .update({ is_primary: false })
          .eq("user_id", userId)
      }

      const { error: assignError } = await supabase.from("user_companies").insert({
        user_id: userId,
        company_id: selectedCompany.id,
        role: assignUserForm.role,
        is_primary: assignUserForm.is_primary,
      })

      if (assignError) {
        alert(`分配失败: ${assignError.message}`)
      } else {
        const roleLabel =
          assignUserForm.role === "owner" ? "所有者" : assignUserForm.role === "admin" ? "管理员" : "成员"
        alert(
          isNewUser
            ? `✅ 用户创建并分配成功！\n\n邮箱：${assignUserForm.user_email}\n默认密码：123456\n角色：${roleLabel}\n${assignUserForm.is_primary ? "已设为主公司" : ""}\n\n请提醒用户首次登录后修改密码。`
            : `✅ 用户分配成功！\n\n邮箱：${assignUserForm.user_email}\n角色：${roleLabel}\n${assignUserForm.is_primary ? "已设为主公司" : ""}`
        )
        setAssignUserForm(INITIAL_ASSIGN_FORM)
        await loadCompanyUsers(selectedCompany.id)
        await loadCompanies()

        if (selectedPermissions.length > 0 || selectedFuelTypes.length > 0) {
          const saveResponse = await fetchWithAuth("/api/admin/update-company-permissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              companyId: selectedCompany.id,
              permissions: selectedPermissions,
              fuelTypes: selectedFuelTypes,
            }),
          })
          const saveResult = await saveResponse.json()
          if (!saveResult.success) {
            console.warn("[供应商管理] 保存权限失败:", saveResult.error)
          }
        }
      }
    } catch (error: any) {
      logBusinessWarning("供应商管理", "分配用户失败", error)
      alert(`分配失败: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveUser = async (userCompanyId: string) => {
    if (!confirm("确定要移除该用户吗？")) return
    if (!supabase) return
    try {
      const { error } = await supabase
        .from("user_companies")
        .delete()
        .eq("id", userCompanyId)
      if (error) {
        alert(`删除失败: ${error.message}`)
      } else {
        alert("用户已移除")
        if (selectedCompany) await loadCompanyUsers(selectedCompany.id)
      }
    } catch (error: any) {
      logBusinessWarning("供应商管理", "删除用户失败", error)
      alert(`删除失败: ${error.message}`)
    }
  }

  const handleUpdateCompanyStatus = async (companyId: string, newStatus: string) => {
    if (!supabase) return
    try {
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
      logBusinessWarning("供应商管理", "更新状态失败", error)
      alert(`更新失败: ${error.message}`)
    }
  }

  const handleSavePermissions = async () => {
    if (!selectedCompany) return
    try {
      const response = await fetchWithAuth("/api/admin/update-company-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          companyId: selectedCompany.id,
          permissions: selectedPermissions,
          fuelTypes: selectedFuelTypes,
        }),
      })
      const result = await response.json()
      if (result.success) {
        alert(
          `✅ 权限保存成功！\n\n功能模块：${selectedPermissions.length} 个\n燃料品种：${selectedFuelTypes.length} 个`
        )
        await loadCompanies()
        await loadCompanyPermissions(selectedCompany.id).then(({ permissions, fuelTypes }) => {
          setSelectedPermissions(permissions)
          setSelectedFuelTypes(fuelTypes)
        })
        setIsPermissionsDialogOpen(false)
      } else {
        alert(`保存权限失败: ${result.error || "未知错误"}`)
      }
    } catch (error: any) {
      alert(`保存权限失败: ${error?.message || "未知错误"}`)
      logBusinessWarning("供应商管理", "保存权限异常", error)
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

      <SupplierSearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {isLoading ? (
        <div className="text-center py-20">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">加载中...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <Card semanticLevel="system_hint" className="bg-slate-800/50 border-slate-700/50">
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
            <SupplierCompanyCard
              key={company.id}
              company={company}
              onAssignUser={handleOpenAssignUserDialog}
              onPermissions={handleOpenPermissionsDialog}
              onStatusChange={handleUpdateCompanyStatus}
              getStatusBadge={getSupplierStatusBadge}
            />
          ))}
        </div>
      )}

      <SupplierCreateCompanyDialog
        open={isCreateCompanyDialogOpen}
        onOpenChange={setIsCreateCompanyDialogOpen}
        formData={newCompany}
        onFormChange={setNewCompany}
        onSubmit={handleCreateCompany}
        isSubmitting={isSubmitting}
      />

      <SupplierAssignUserDialog
        open={isAssignUserDialogOpen}
        onOpenChange={setIsAssignUserDialogOpen}
        company={selectedCompany}
        companyUsers={companyUsers}
        assignForm={assignUserForm}
        onAssignFormChange={setAssignUserForm}
        onAssign={handleAssignUser}
        onRemoveUser={handleRemoveUser}
        isSubmitting={isSubmitting}
      />

      <SupplierPermissionsDialog
        open={isPermissionsDialogOpen}
        onOpenChange={setIsPermissionsDialogOpen}
        company={selectedCompany}
        selectedPermissions={selectedPermissions}
        selectedFuelTypes={selectedFuelTypes}
        onPermissionsChange={setSelectedPermissions}
        onFuelTypesChange={setSelectedFuelTypes}
        onSave={handleSavePermissions}
      />
    </div>
  )
}
