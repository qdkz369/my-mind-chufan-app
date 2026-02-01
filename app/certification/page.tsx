"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Upload, ExternalLink, Lock, Building2 } from "lucide-react"
import Link from "next/link"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"

interface Certification {
  id?: string
  legal_rep_name?: string | null
  legal_rep_id_number?: string | null
  legal_rep_phone?: string | null
  company_name?: string | null
  unified_social_credit_code?: string | null
  registered_address?: string | null
  business_scope?: string | null
  business_license_url?: string | null
  food_license_url?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export default function CertificationPage() {
  const [needLogin, setNeedLogin] = useState(false)
  const [data, setData] = useState<Certification | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<"business_license" | "food_license" | null>(null)
  const [form, setForm] = useState({
    legal_rep_name: "",
    legal_rep_id_number: "",
    legal_rep_phone: "",
    company_name: "",
    unified_social_credit_code: "",
    registered_address: "",
    business_scope: "",
  })

  const getHeaders = (): HeadersInit => {
    const h: HeadersInit = { "Content-Type": "application/json" }
    const rid = typeof window !== "undefined" ? localStorage.getItem("restaurantId") : null
    if (rid) h["x-restaurant-id"] = rid
    return h
  }

  const load = async () => {
    const rid = typeof window !== "undefined" ? localStorage.getItem("restaurantId") : null
    if (!rid) {
      setNeedLogin(true)
      setLoading(false)
      return
    }
    setNeedLogin(false)
    setLoading(true)
    try {
      const res = await fetchWithAuth("/api/certification", {
        credentials: "include",
        headers: getHeaders(),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        setForm({
          legal_rep_name: json.data.legal_rep_name || "",
          legal_rep_id_number: json.data.legal_rep_id_number || "",
          legal_rep_phone: json.data.legal_rep_phone || "",
          company_name: json.data.company_name || "",
          unified_social_credit_code: json.data.unified_social_credit_code || "",
          registered_address: json.data.registered_address || "",
          business_scope: json.data.business_scope || "",
        })
      } else {
        setData(null)
      }
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetchWithAuth("/api/certification", {
        method: "PUT",
        credentials: "include",
        headers: getHeaders(),
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        await load()
        alert("保存成功")
      } else {
        alert(json.error || json.details || "保存失败")
      }
    } catch (e: any) {
      alert(e?.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (type: "business_license" | "food_license", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const rid = typeof window !== "undefined" ? localStorage.getItem("restaurantId") : null
    if (!rid) {
      setNeedLogin(true)
      return
    }
    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", type)
    setUploading(type)
    try {
      const res = await fetch("/api/certification/upload", {
        method: "POST",
        headers: { "x-restaurant-id": rid },
        body: fd,
      })
      const json = await res.json()
      if (json.success) {
        await load()
      } else {
        alert(json.error || "上传失败")
      }
    } catch (err: any) {
      alert(err?.message || "上传失败")
    } finally {
      setUploading(null)
      e.target.value = ""
    }
  }

  const statusLabel: Record<string, string> = {
    draft: "草稿",
    pending: "待审核",
    approved: "已认证",
    rejected: "已驳回",
  }
  const statusVariant: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
    draft: "secondary",
    pending: "outline",
    approved: "default",
    rejected: "destructive",
  }

  return (
    <main className="min-h-screen bg-background pb-20 transition-colors duration-300">
      <Header />
      <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
        <Link href="/profile">
          <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-4">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">返回</span>
          </div>
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">资质认证</h1>
          <p className="text-sm text-muted-foreground">企业资质认证，享受企业级燃料配送、设备租赁及对公结算等服务</p>
        </div>

        {needLogin ? (
          <Card semanticLevel="secondary_fact" className="theme-card p-6">
            <p className="text-muted-foreground text-center mb-4">请先登录</p>
            <Link href="/profile">
              <Button className="w-full">去登录</Button>
            </Link>
          </Card>
        ) : loading ? (
          <Card semanticLevel="secondary_fact" className="theme-card p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </Card>
        ) : (
          <div className="space-y-6">
            {data?.status && data.status !== "draft" && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">认证状态</span>
                <Badge variant={statusVariant[data.status] || "secondary"}>
                  {statusLabel[data.status] || data.status}
                </Badge>
              </div>
            )}

            <Card semanticLevel="secondary_fact" className="theme-card p-6 space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">法人信息（敏感，仅本人可见）</h2>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>法人姓名 *</Label>
                  <Input
                    value={form.legal_rep_name}
                    onChange={(e) => setForm((f) => ({ ...f, legal_rep_name: e.target.value }))}
                    placeholder="请输入法人姓名"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>法人身份证号 *</Label>
                  <Input
                    type="password"
                    value={form.legal_rep_id_number}
                    onChange={(e) => setForm((f) => ({ ...f, legal_rep_id_number: e.target.value }))}
                    placeholder="请输入18位身份证号"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">身份证号以密码形式存储，不会在日志中泄露</p>
                </div>
                <div className="grid gap-2">
                  <Label>法人联系电话</Label>
                  <Input
                    value={form.legal_rep_phone}
                    onChange={(e) => setForm((f) => ({ ...f, legal_rep_phone: e.target.value }))}
                    placeholder="选填"
                  />
                </div>
              </div>
            </Card>

            <Card semanticLevel="secondary_fact" className="theme-card p-6 space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">企业信息</h2>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>企业名称 *</Label>
                  <Input
                    value={form.company_name}
                    onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                    placeholder="与营业执照一致"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>统一社会信用代码 *</Label>
                  <Input
                    value={form.unified_social_credit_code}
                    onChange={(e) => setForm((f) => ({ ...f, unified_social_credit_code: e.target.value }))}
                    placeholder="18位统一社会信用代码"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>注册地址</Label>
                  <Input
                    value={form.registered_address}
                    onChange={(e) => setForm((f) => ({ ...f, registered_address: e.target.value }))}
                    placeholder="与营业执照一致"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>经营范围</Label>
                  <textarea
                    value={form.business_scope}
                    onChange={(e) => setForm((f) => ({ ...f, business_scope: e.target.value }))}
                    placeholder="选填"
                    className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </Card>

            <Card semanticLevel="secondary_fact" className="theme-card p-6 space-y-4">
              <div className="flex items-center gap-2 text-foreground">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">证件上传</h2>
              </div>
              <p className="text-xs text-muted-foreground">支持 JPG、PNG、WebP、PDF，单文件不超过 5MB</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border border-dashed rounded-lg p-4 space-y-2">
                  <Label>营业执照</Label>
                  {data?.business_license_url ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={data.business_license_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" /> 查看
                      </a>
                      <label className="text-sm text-primary hover:underline cursor-pointer">
                        {uploading === "business_license" ? "上传中..." : "重新上传"}
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => handleUpload("business_license", e)}
                          disabled={!!uploading}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center min-h-[80px] border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleUpload("business_license", e)}
                        disabled={!!uploading}
                      />
                      {uploading === "business_license" ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground mb-1" />
                      )}
                      <span className="text-xs text-muted-foreground">点击上传</span>
                    </label>
                  )}
                </div>
                <div className="border border-dashed rounded-lg p-4 space-y-2">
                  <Label>食品经营许可证</Label>
                  {data?.food_license_url ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={data.food_license_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" /> 查看
                      </a>
                      <label className="text-sm text-primary hover:underline cursor-pointer">
                        {uploading === "food_license" ? "上传中..." : "重新上传"}
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => handleUpload("food_license", e)}
                          disabled={!!uploading}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center min-h-[80px] border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleUpload("food_license", e)}
                        disabled={!!uploading}
                      />
                      {uploading === "food_license" ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground mb-1" />
                      )}
                      <span className="text-xs text-muted-foreground">点击上传</span>
                    </label>
                  )}
                </div>
              </div>
            </Card>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 保存中...</> : "保存"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              您的法人及企业信息受保护，仅您本人可查看和编辑。平台仅在审核时按需调用，不会向第三方泄露。
            </p>
          </div>
        )}
      </div>
      <BottomNavigation />
    </main>
  )
}
