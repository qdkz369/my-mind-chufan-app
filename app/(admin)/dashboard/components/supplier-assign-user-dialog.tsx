"use client"

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
import { UserPlus, Users, Trash2, Loader2 } from "lucide-react"
import type { Company, UserCompany } from "./supplier-management-types"

interface AssignUserForm {
  user_email: string
  role: string
  is_primary: boolean
}

interface SupplierAssignUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: Company | null
  companyUsers: UserCompany[]
  assignForm: AssignUserForm
  onAssignFormChange: (form: AssignUserForm) => void
  onAssign: () => Promise<void>
  onRemoveUser: (userCompanyId: string) => Promise<void>
  isSubmitting: boolean
}

export function SupplierAssignUserDialog({
  open,
  onOpenChange,
  company,
  companyUsers,
  assignForm,
  onAssignFormChange,
  onAssign,
  onRemoveUser,
  isSubmitting,
}: SupplierAssignUserDialogProps) {
  const roleLabel = (role: string) =>
    role === "owner" ? "所有者" : role === "admin" ? "管理员" : "成员"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">
            分配用户 - {company?.name}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            将用户账号关联到此供应商公司
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Card semanticLevel="action" className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">分配新用户</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">用户邮箱 *</Label>
                <Input
                  type="email"
                  value={assignForm.user_email}
                  onChange={(e) =>
                    onAssignFormChange({
                      ...assignForm,
                      user_email: e.target.value,
                    })
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
                    value={assignForm.role}
                    onValueChange={(value) =>
                      onAssignFormChange({ ...assignForm, role: value })
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
                      checked={assignForm.is_primary}
                      onChange={(e) =>
                        onAssignFormChange({
                          ...assignForm,
                          is_primary: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                    />
                    <span className="text-slate-300 text-sm">设为主公司</span>
                  </label>
                </div>
              </div>

              <Button
                onClick={onAssign}
                disabled={isSubmitting || !assignForm.user_email.trim()}
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

          <Card semanticLevel="secondary_fact" className="bg-slate-800/50 border-slate-700">
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
                            {uc.users?.email ||
                              uc.users?.phone ||
                              `用户ID: ${uc.user_id.slice(0, 8)}...`}
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
                                  : uc.role === "platform_admin"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-slate-500/20 text-slate-400"
                              }
                            >
                              {roleLabel(uc.role)}
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
                        onClick={() => onRemoveUser(uc.id)}
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
  )
}
