"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPlus, Edit, Users, CheckCircle2 } from "lucide-react"
import type { Company } from "./supplier-management-types"

interface SupplierCompanyCardProps {
  company: Company
  onAssignUser: (company: Company) => void
  onPermissions: (company: Company) => void
  onStatusChange: (companyId: string, status: string) => void
  getStatusBadge: (status: string) => React.ReactNode
}

export function SupplierCompanyCard({
  company,
  onAssignUser,
  onPermissions,
  onStatusChange,
  getStatusBadge,
}: SupplierCompanyCardProps) {
  const hasPermissions =
    (company.permissions_count ?? 0) > 0 || (company.fuel_types_count ?? 0) > 0

  return (
    <Card
      semanticLevel="secondary_fact"
      className="bg-slate-800/50 border-slate-700/50 hover:border-blue-500/50 transition-all"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-lg mb-2">{company.name}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {getStatusBadge(company.status)}
              {(company.user_count ?? 0) > 0 ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>已分配 {company.user_count} 人</span>
                </Badge>
              ) : (
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

        {hasPermissions ? (
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-700">
            <div className="flex items-center gap-2 flex-wrap">
              {(company.permissions_count ?? 0) > 0 && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>功能权限: {company.permissions_count} 项</span>
                </Badge>
              )}
              {(company.fuel_types_count ?? 0) > 0 && (
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
            onClick={() => onAssignUser(company)}
            className={`flex-1 ${
              (company.user_count ?? 0) > 0
                ? "border-green-500/50 text-green-400 hover:bg-green-500/10"
                : "border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            }`}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            {(company.user_count ?? 0) > 0
              ? `已分配 (${company.user_count})`
              : "分配用户"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPermissions(company)}
            className={`flex-1 ${
              hasPermissions
                ? "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                : "border-slate-500/50 text-slate-400 hover:bg-slate-500/10"
            }`}
          >
            <Edit className="h-3 w-3 mr-1" />
            {hasPermissions ? "管理权限" : "配置权限"}
          </Button>
          <Select
            value={company.status}
            onValueChange={(value) => onStatusChange(company.id, value)}
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
  )
}
