"use client"

import { useState, useCallback, useEffect } from "react"
import { logBusinessWarning } from "@/lib/utils/logger"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import {
  FileText,
  Loader2,
  Receipt,
  RefreshCw,
  Upload,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

const statusLabels: Record<string, string> = {
  pending: "待处理",
  processing: "开票中",
  issued: "已开票",
  rejected: "已拒绝",
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  issued: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
}

export interface InvoicesWithDialogsProps {
  userRole?: string | null
  userCompanyId?: string | null
}

export function InvoicesWithDialogs({ userRole, userCompanyId }: InvoicesWithDialogsProps) {
  const [invoices, setInvoices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string>("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const loadInvoices = useCallback(async () => {
    if (userRole !== null && userRole !== "super_admin" && userRole !== "platform_admin" && userRole !== "company_admin" && userRole !== "admin" && userRole !== "staff" && !userCompanyId) {
      setInvoices([])
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)
      params.append("page", "1")
      params.append("page_size", "100")
      const url = `/api/admin/invoices?${params.toString()}`
      const res = await fetchWithAuth(url, { credentials: "include" })
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login"
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json()
      if (json.success) setInvoices(json.data || [])
      else setInvoices([])
    } catch (e) {
      logBusinessWarning("发票管理", "加载失败", e)
      setInvoices([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, userRole, userCompanyId])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedInvoice) return
    const isPdf = file.type === "application/pdf"
    const isImage = file.type.startsWith("image/")
    if (!isPdf && !isImage) {
      alert("仅支持 PDF 或图片（JPG、PNG、GIF、WebP）")
      return
    }
    if (file.size > (isPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024)) {
      alert(isPdf ? "PDF 大小不能超过 10MB" : "图片大小不能超过 5MB")
      return
    }
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetchWithAuth(`/api/admin/invoices/${selectedInvoice.id}/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const json = await res.json()
      if (json.success) {
        setSelectedInvoice((prev: any) => (prev ? { ...prev, invoice_file_url: json.data?.url } : null))
        await loadInvoices()
        alert("上传成功")
      } else {
        alert(json.error || json.details || "上传失败")
      }
    } catch (err: any) {
      alert(err?.message || "上传失败")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedInvoice) return
    if (!updateStatus || !["processing", "issued", "rejected"].includes(updateStatus)) {
      alert("请选择有效状态")
      return
    }
    if (updateStatus === "issued" && !invoiceNumber.trim()) {
      alert("已开票需填写发票号")
      return
    }
    setIsUpdating(true)
    try {
      const res = await fetchWithAuth(`/api/admin/invoices/${selectedInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: updateStatus,
          invoice_number: updateStatus === "issued" ? invoiceNumber.trim() : undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        await loadInvoices()
        setDialogOpen(false)
        setSelectedInvoice(null)
        setUpdateStatus("")
        setInvoiceNumber("")
        alert(json.message || "更新成功")
      } else {
        alert(json.error || json.details || "更新失败")
      }
    } catch (e: any) {
      alert(e?.message || "更新失败")
    } finally {
      setIsUpdating(false)
    }
  }

  const formatAmount = (v: number) =>
    new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(v)
  const formatDate = (s: string) =>
    new Date(s).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-white">发票管理</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="pending">待处理</SelectItem>
              <SelectItem value="processing">开票中</SelectItem>
              <SelectItem value="issued">已开票</SelectItem>
              <SelectItem value="rejected">已拒绝</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadInvoices} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      <Card semanticLevel="secondary_fact" className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无发票申请</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-700/30 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedInvoice(inv)
                    setUpdateStatus(inv.status === "pending" ? "processing" : inv.status)
                    setInvoiceNumber(inv.invoice_number || "")
                    setDialogOpen(true)
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20 shrink-0">
                      <FileText className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{inv.order_number || "—"}</p>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {inv.restaurant?.name || "—"} · {inv.company_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {inv.order_type === "fuel" ? "燃料订单" : "租赁订单"} · {formatDate(inv.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 sm:mt-0">
                    <span className="font-semibold text-white">{formatAmount(inv.amount)}</span>
                    <Badge className={statusColors[inv.status] || "bg-slate-500/20"}>
                      {statusLabels[inv.status] || inv.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-slate-800 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>发票详情</DialogTitle>
            <DialogDescription>查看并更新开票状态</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">订单号</span>
                  <span>{selectedInvoice.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">餐厅</span>
                  <span>{selectedInvoice.restaurant?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">金额</span>
                  <span>{formatAmount(selectedInvoice.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">发票类型</span>
                  <span>{selectedInvoice.invoice_type === "special" ? "增值税专用发票" : "增值税普通发票"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">抬头</span>
                  <span>{selectedInvoice.company_name}</span>
                </div>
                {selectedInvoice.tax_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">纳税人识别号</span>
                    <span>{selectedInvoice.tax_id}</span>
                  </div>
                )}
                {selectedInvoice.address && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">地址</span>
                    <span>{selectedInvoice.address}</span>
                  </div>
                )}
                {selectedInvoice.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">电话</span>
                    <span>{selectedInvoice.phone}</span>
                  </div>
                )}
                {selectedInvoice.email && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">邮箱</span>
                    <span>{selectedInvoice.email}</span>
                  </div>
                )}
                {selectedInvoice.bank_name && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">开户行</span>
                      <span>{selectedInvoice.bank_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">银行账号</span>
                      <span>{selectedInvoice.bank_account}</span>
                    </div>
                  </>
                )}
              </div>

              {selectedInvoice.status === "pending" || selectedInvoice.status === "processing" ? (
                <div className="space-y-4 pt-4 border-t border-slate-700">
                  <div className="grid gap-2">
                    <Label className="text-slate-300">更新状态</Label>
                    <Select value={updateStatus} onValueChange={setUpdateStatus}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="processing">开票中</SelectItem>
                        <SelectItem value="issued">已开票</SelectItem>
                        <SelectItem value="rejected">已拒绝</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {updateStatus === "issued" && (
                    <div className="grid gap-2">
                      <Label className="text-slate-300">发票号 *</Label>
                      <Input
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="请输入发票号码"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  )}
                  {(updateStatus === "processing" || updateStatus === "issued") && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">电子发票（PDF/图片）</Label>
                      {selectedInvoice.invoice_file_url ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={selectedInvoice.invoice_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-400 hover:underline text-sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                            查看电子发票
                          </a>
                          <span className="text-slate-500">|</span>
                          <label className="cursor-pointer text-sm text-blue-400 hover:underline">
                            {isUploading ? "上传中..." : "重新上传"}
                            <input
                              type="file"
                              accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                              className="hidden"
                              onChange={handleUploadFile}
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full min-h-[80px] border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500/50 transition-colors">
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={handleUploadFile}
                            disabled={isUploading}
                          />
                          {isUploading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-2" />
                          ) : (
                            <Upload className="h-8 w-8 text-slate-400 mb-2" />
                          )}
                          <span className="text-sm text-slate-400">
                            {isUploading ? "上传中..." : "点击上传 PDF 或图片"}
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={isUpdating || (updateStatus === "issued" && !invoiceNumber.trim())}
                    className="w-full"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        更新中...
                      </>
                    ) : (
                      "保存"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-700 space-y-3">
                  {selectedInvoice.invoice_number && (
                    <>
                      <p className="text-sm text-slate-400">发票号：{selectedInvoice.invoice_number}</p>
                      {selectedInvoice.issued_at && (
                        <p className="text-sm text-slate-400">
                          开票时间：{formatDate(selectedInvoice.issued_at)}
                        </p>
                      )}
                    </>
                  )}
                  {(selectedInvoice.status === "processing" || selectedInvoice.status === "issued") && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">电子发票（PDF/图片）</Label>
                      {selectedInvoice.invoice_file_url ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={selectedInvoice.invoice_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-400 hover:underline text-sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                            查看电子发票
                          </a>
                          <span className="text-slate-500">|</span>
                          <label className="cursor-pointer text-sm text-blue-400 hover:underline">
                            {isUploading ? "上传中..." : "重新上传"}
                            <input
                              type="file"
                              accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                              className="hidden"
                              onChange={handleUploadFile}
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full min-h-[80px] border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500/50 transition-colors">
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={handleUploadFile}
                            disabled={isUploading}
                          />
                          {isUploading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-2" />
                          ) : (
                            <Upload className="h-8 w-8 text-slate-400 mb-2" />
                          )}
                          <span className="text-sm text-slate-400">
                            {isUploading ? "上传中..." : "点击上传 PDF 或图片"}
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
