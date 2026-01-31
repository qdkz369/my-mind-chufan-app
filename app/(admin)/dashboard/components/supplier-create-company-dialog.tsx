"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { CheckCircle2, Loader2 } from "lucide-react"

interface NewCompanyForm {
  name: string
  contact_name: string
  contact_phone: string
  contact_email: string
  address: string
  business_license: string
  status: string
}

interface SupplierCreateCompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: NewCompanyForm
  onFormChange: (data: NewCompanyForm) => void
  onSubmit: () => Promise<void>
  isSubmitting: boolean
}

const INITIAL_FORM: NewCompanyForm = {
  name: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  address: "",
  business_license: "",
  status: "active",
}

export function SupplierCreateCompanyDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  isSubmitting,
}: SupplierCreateCompanyDialogProps) {
  const handleClose = (next: boolean) => {
    if (!next) onFormChange(INITIAL_FORM)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              placeholder="例如：XX设备租赁有限公司"
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 mb-2 block">联系人</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) =>
                  onFormChange({ ...formData, contact_name: e.target.value })
                }
                placeholder="联系人姓名"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">联系电话</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) =>
                  onFormChange({ ...formData, contact_phone: e.target.value })
                }
                placeholder="联系电话"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300 mb-2 block">联系邮箱</Label>
            <Input
              type="email"
              value={formData.contact_email}
              onChange={(e) =>
                onFormChange({ ...formData, contact_email: e.target.value })
              }
              placeholder="contact@example.com"
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div>
            <Label className="text-slate-300 mb-2 block">公司地址</Label>
            <Textarea
              value={formData.address}
              onChange={(e) =>
                onFormChange({ ...formData, address: e.target.value })
              }
              placeholder="公司详细地址"
              className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
            />
          </div>

          <div>
            <Label className="text-slate-300 mb-2 block">营业执照号</Label>
            <Input
              value={formData.business_license}
              onChange={(e) =>
                onFormChange({ ...formData, business_license: e.target.value })
              }
              placeholder="营业执照号（可选）"
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div>
            <Label className="text-slate-300 mb-2 block">状态</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                onFormChange({ ...formData, status: value })
              }
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
              onClick={() => handleClose(false)}
              className="flex-1 text-slate-400 hover:text-white"
            >
              取消
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || !formData.name.trim()}
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
  )
}
