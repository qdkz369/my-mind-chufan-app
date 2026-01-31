"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2 } from "lucide-react"
import type { Company } from "./supplier-management-types"
import {
  AVAILABLE_PERMISSIONS,
  AVAILABLE_FUEL_TYPES,
} from "./supplier-management-types"

interface SupplierPermissionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: Company | null
  selectedPermissions: string[]
  selectedFuelTypes: string[]
  onPermissionsChange: (keys: string[]) => void
  onFuelTypesChange: (keys: string[]) => void
  onSave: () => Promise<void>
}

export function SupplierPermissionsDialog({
  open,
  onOpenChange,
  company,
  selectedPermissions,
  selectedFuelTypes,
  onPermissionsChange,
  onFuelTypesChange,
  onSave,
}: SupplierPermissionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">
            管理权限 - {company?.name}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            配置该供应商可以访问的功能模块和可供应的燃料品种
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Card
            semanticLevel="action"
            className="bg-slate-800/50 border-slate-700"
            data-permissions-card
          >
            <CardHeader>
              <CardTitle className="text-white text-lg">
                主营业务权限配置
                {(selectedPermissions.length > 0 || selectedFuelTypes.length > 0) && (
                  <span className="ml-2 text-sm text-slate-400 font-normal">
                    （已配置 {selectedPermissions.length} 项功能，
                    {selectedFuelTypes.length} 种燃料）
                  </span>
                )}
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                配置该供应商可以访问的功能模块和可供应的燃料品种。支持勾选/取消勾选进行修改。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-3 block">功能模块权限</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-700/30 rounded-lg">
                  {AVAILABLE_PERMISSIONS.map((permission) => (
                    <label
                      key={permission.key}
                      className="flex items-center gap-2 p-2 rounded hover:bg-slate-700/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onPermissionsChange([
                              ...selectedPermissions,
                              permission.key,
                            ])
                          } else {
                            onPermissionsChange(
                              selectedPermissions.filter((p) => p !== permission.key)
                            )
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                      />
                      <span className="text-slate-300 text-sm">
                        {permission.label}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  已选择 {selectedPermissions.length} 个功能模块
                </p>
              </div>

              <div>
                <Label className="text-slate-300 mb-3 block">
                  可供应燃料品种
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {AVAILABLE_FUEL_TYPES.map((fuelType) => (
                    <label
                      key={fuelType.key}
                      className="flex items-center gap-2 p-2 rounded hover:bg-slate-700/50 cursor-pointer bg-slate-700/30"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFuelTypes.includes(fuelType.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onFuelTypesChange([
                              ...selectedFuelTypes,
                              fuelType.key,
                            ])
                          } else {
                            onFuelTypesChange(
                              selectedFuelTypes.filter((f) => f !== fuelType.key)
                            )
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                      />
                      <span className="text-slate-300 text-sm">
                        {fuelType.label}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  已选择 {selectedFuelTypes.length} 个燃料品种
                </p>
              </div>

              <Button
                onClick={onSave}
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
  )
}
