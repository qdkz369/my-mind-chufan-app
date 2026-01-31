"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, Edit, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react"
import { logBusinessWarning } from "@/lib/utils/logger"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"

interface Agreement {
  id: string
  title: string
  type: string
  version: string
  content: string
  content_html?: string
  status: string
  is_active: boolean
  effective_date?: string
  expiry_date?: string
  description?: string
  created_at: string
  updated_at: string
}

export function AgreementManagement() {
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    type: "service" as "service" | "payment" | "privacy" | "terms" | "rental",
    version: "1.0",
    content: "",
    content_html: "",
    status: "draft",
    is_active: false,
    effective_date: "",
    expiry_date: "",
    description: "",
  })
  const [typeFilter, setTypeFilter] = useState<string>("all")

  useEffect(() => {
    loadAgreements()
  }, [typeFilter])

  const loadAgreements = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== "all") params.set("type", typeFilter)
      const response = await fetchWithAuth(`/api/agreements?${params.toString()}`, { credentials: "include" })
      const result = await response.json()
      if (result.success) {
        setAgreements(result.data || [])
      } else {
        logBusinessWarning('协议管理', '加载协议列表失败', result.error)
      }
    } catch (error) {
      logBusinessWarning('协议管理', '加载协议列表失败', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingAgreement(null)
    setFormData({
      title: "",
      type: "service" as const,
      version: "1.0",
      content: "",
      content_html: "",
      status: "draft",
      is_active: false,
      effective_date: "",
      expiry_date: "",
      description: "",
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (agreement: Agreement) => {
    setEditingAgreement(agreement)
    const validTypes = ["rental", "payment", "service", "privacy", "terms"] as const
    const agreementType = validTypes.includes(agreement.type as typeof validTypes[number])
      ? (agreement.type as typeof validTypes[number])
      : "service"
    setFormData({
      title: agreement.title,
      type: agreementType,
      version: agreement.version,
      content: agreement.content,
      content_html: agreement.content_html || "",
      status: agreement.status,
      is_active: agreement.is_active,
      effective_date: agreement.effective_date || "",
      expiry_date: agreement.expiry_date || "",
      description: agreement.description || "",
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      alert("请填写协议标题和内容")
      return
    }

    setIsSaving(true)
    try {
      const url = editingAgreement
        ? `/api/agreements/${editingAgreement.id}`
        : "/api/agreements"
      const method = editingAgreement ? "PUT" : "POST"

      const response = await fetchWithAuth(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      if (result.success) {
        alert(editingAgreement ? "协议更新成功" : "协议创建成功")
        setIsDialogOpen(false)
        loadAgreements()
      } else {
        alert(result.error || "保存失败")
      }
    } catch (error) {
      logBusinessWarning('协议管理', '保存协议失败', error)
      alert("保存失败")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个协议吗？")) return

    try {
      const response = await fetchWithAuth(`/api/agreements/${id}`, {
        method: "DELETE",
        credentials: "include",
      })

      const result = await response.json()
      if (result.success) {
        alert("协议已删除")
        loadAgreements()
      } else {
        alert(result.error || "删除失败")
      }
    } catch (error) {
      logBusinessWarning('协议管理', '删除协议失败', error)
      alert("删除失败")
    }
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (isActive && status === "published") {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">已生效</Badge>
    }
    if (status === "published") {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">已发布</Badge>
    }
    if (status === "draft") {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">草稿</Badge>
    }
    if (status === "archived") {
      return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">已归档</Badge>
    }
    return null
  }

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      service: "服务协议",
      payment: "支付协议",
      privacy: "隐私协议",
      terms: "使用条款",
      rental: "租赁协议",
    }
    return typeMap[type] || type
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">协议管理</h2>
          <p className="text-slate-400 mt-1">管理服务协议、支付协议等各类协议内容</p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          新建协议
        </Button>
      </div>

      {/* 类型筛选：全部 / 各类型（含租赁协议） */}
      <div className="flex flex-wrap gap-2">
        {(["all", "service", "payment", "privacy", "terms", "rental"] as const).map((key) => (
          <Button
            key={key}
            variant={typeFilter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(key)}
            className={
              typeFilter === key
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "border-slate-600 text-slate-400 hover:bg-slate-800"
            }
          >
            {key === "all" ? "全部" : getTypeLabel(key)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Card semanticLevel="system_hint" className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6 text-center text-slate-400">
            加载中...
          </CardContent>
        </Card>
      ) : agreements.length === 0 ? (
        <Card semanticLevel="system_hint" className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6 text-center text-slate-400">
            暂无协议，点击"新建协议"创建第一个协议
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {agreements.map((agreement) => (
            <Card
              key={agreement.id}
              semanticLevel="secondary_fact"
              className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-blue-400" />
                      <h3 className="text-lg font-bold text-white">{agreement.title}</h3>
                      {getStatusBadge(agreement.status, agreement.is_active)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                      <div>
                        <span className="text-slate-400">类型：</span>
                        <span className="text-white ml-2">{getTypeLabel(agreement.type)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">版本：</span>
                        <span className="text-white ml-2">{agreement.version}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">状态：</span>
                        <span className="text-white ml-2">{agreement.status}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">创建时间：</span>
                        <span className="text-white ml-2">
                          {new Date(agreement.created_at).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    </div>
                    {agreement.description && (
                      <p className="text-slate-400 text-sm mt-3">{agreement.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(agreement)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(agreement.id)}
                      className="border-red-600 text-red-400 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 编辑/创建对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editingAgreement ? "编辑协议" : "新建协议"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingAgreement ? "修改协议内容" : "创建新的协议"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300">协议标题 *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                placeholder="例如：服务协议"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">协议类型 *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="service">服务协议</SelectItem>
                    <SelectItem value="payment">支付协议</SelectItem>
                    <SelectItem value="privacy">隐私协议</SelectItem>
                    <SelectItem value="terms">使用条款</SelectItem>
                    <SelectItem value="rental">租赁协议</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">版本号 *</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  placeholder="例如：1.0"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">协议内容 *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white mt-1 min-h-[300px]"
                placeholder="请输入协议正文内容（支持Markdown格式）"
              />
            </div>

            <div>
              <Label className="text-slate-300">HTML内容（可选）</Label>
              <Textarea
                value={formData.content_html}
                onChange={(e) => setFormData({ ...formData, content_html: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white mt-1 min-h-[200px]"
                placeholder="如果提供HTML内容，将优先显示HTML版本"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">状态</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="published">已发布</SelectItem>
                    <SelectItem value="archived">已归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4 mt-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-slate-300">设为生效版本</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">生效日期</Label>
                <Input
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-300">失效日期</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">描述/说明</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                placeholder="协议描述或说明"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-slate-600 text-slate-300"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
