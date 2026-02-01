"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Copy, ExternalLink, FileText, Fuel, Package, Loader2, Receipt } from "lucide-react"
import Link from "next/link"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import { InvoiceDownloadActions } from "@/components/invoice-download-actions"

interface EligibleOrder {
  id: string
  order_number: string
  order_type: "fuel" | "rental"
  total_amount: number
  status: string
  created_at: string
  payment_method?: string
  corporate_company_name?: string
  corporate_tax_id?: string
}

interface InvoiceRecord {
  id: string
  order_main_id: string
  order_number?: string
  order_type?: string
  amount: number
  invoice_type: string
  company_name: string
  status: string
  invoice_number?: string
  issued_at?: string
  created_at: string
  invoice_file_url?: string
}

export default function InvoicesPage() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"apply" | "records">("apply")
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([])
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<EligibleOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [formData, setFormData] = useState({
    invoice_type: "normal",
    title_type: "enterprise",
    company_name: "",
    tax_id: "",
    address: "",
    phone: "",
    bank_name: "",
    bank_account: "",
    email: "",
  })

  const [needLogin, setNeedLogin] = useState(false)

  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = { "Content-Type": "application/json" }
    const restaurantId = typeof window !== "undefined" ? localStorage.getItem("restaurantId") : null
    if (restaurantId) headers["x-restaurant-id"] = restaurantId
    return headers
  }

  const loadEligibleOrders = async () => {
    const rid = typeof window !== "undefined" ? localStorage.getItem("restaurantId") : null
    if (!rid) {
      setNeedLogin(true)
      setLoadingOrders(false)
      return
    }
    setNeedLogin(false)
    setLoadingOrders(true)
    try {
      const res = await fetchWithAuth("/api/invoices/eligible-orders", {
        credentials: "include",
        headers: getHeaders(),
      })
      const json = await res.json()
      if (json.success) setEligibleOrders(json.data || [])
      else if (res.status === 401) setNeedLogin(true)
    } catch {
      setEligibleOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  const loadInvoices = async () => {
    setLoadingInvoices(true)
    try {
      const res = await fetchWithAuth("/api/invoices?page=1&page_size=50", {
        credentials: "include",
        headers: getHeaders(),
      })
      const json = await res.json()
      if (json.success) setInvoices(json.data || [])
    } catch {
      setInvoices([])
    } finally {
      setLoadingInvoices(false)
    }
  }

  useEffect(() => {
    loadEligibleOrders()
  }, [])

  useEffect(() => {
    if (tab === "records") loadInvoices()
  }, [tab])

  useEffect(() => {
    const orderId = searchParams.get("orderId")
    if (!orderId || eligibleOrders.length === 0) return
    const order = eligibleOrders.find((o) => o.id === orderId)
    if (order) {
      setTab("apply")
      setSelectedOrder(order)
      setFormData((prev) => ({
        ...prev,
        company_name: order.corporate_company_name || "",
        tax_id: order.corporate_tax_id || "",
      }))
      setShowForm(true)
      if (typeof window !== "undefined") window.history.replaceState({}, "", "/invoices")
    }
  }, [searchParams, eligibleOrders])

  const handleApplyClick = (order: EligibleOrder) => {
    setSelectedOrder(order)
    setFormData({
      invoice_type: "normal",
      title_type: "enterprise",
      company_name: order.corporate_company_name || "",
      tax_id: order.corporate_tax_id || "",
      address: "",
      phone: "",
      bank_name: "",
      bank_account: "",
      email: "",
    })
    setSubmitError("")
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return
    setSubmitting(true)
    setSubmitError("")
    try {
      const res = await fetchWithAuth("/api/invoices", {
        method: "POST",
        credentials: "include",
        headers: getHeaders(),
        body: JSON.stringify({
          order_main_id: selectedOrder.id,
          invoice_type: formData.invoice_type,
          title_type: formData.title_type,
          company_name: formData.company_name,
          tax_id: formData.tax_id || undefined,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          bank_name: formData.bank_name || undefined,
          bank_account: formData.bank_account || undefined,
          email: formData.email || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowForm(false)
        setSelectedOrder(null)
        loadEligibleOrders()
        if (tab === "records") loadInvoices()
      } else {
        setSubmitError(json.error || json.details || "提交失败")
      }
    } catch {
      setSubmitError("网络错误，请重试")
    } finally {
      setSubmitting(false)
    }
  }

  const formatAmount = (v: number) =>
    new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(v)
  const formatDate = (s: string) =>
    new Date(s).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

  const statusLabel: Record<string, string> = {
    pending: "待处理",
    processing: "开票中",
    issued: "已开票",
    rejected: "已拒绝",
  }
  const statusVariant: Record<string, "secondary" | "default" | "outline"> = {
    pending: "secondary",
    processing: "default",
    issued: "default",
    rejected: "outline",
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
          <h1 className="text-2xl font-bold text-foreground mb-2">发票管理</h1>
          <p className="text-sm text-muted-foreground">开具和查看您的消费发票</p>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-2 border-b border-border pb-2">
          <button
            onClick={() => setTab("apply")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "apply" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            申请开票
          </button>
          <button
            onClick={() => setTab("records")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "records" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            发票记录
          </button>
        </div>

        {needLogin && (
          <Card semanticLevel="system_hint" className="theme-card p-6 text-center">
            <p className="text-muted-foreground mb-4">请先登录后查看发票管理</p>
            <Link href="/profile">
              <Button>前往登录</Button>
            </Link>
          </Card>
        )}

        {!needLogin && tab === "apply" && (
          <>
            <Card semanticLevel="secondary_fact" className="theme-card p-4">
              <h3 className="font-medium text-foreground mb-2">可申请发票的订单</h3>
              <p className="text-xs text-muted-foreground mb-4">
                仅支持对已完成/已支付的订单申请开票，每个订单限申请一次
              </p>
              {loadingOrders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : eligibleOrders.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>暂无可开发票的订单</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {eligibleOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {order.order_type === "fuel" ? (
                            <Fuel className="h-4 w-4 text-primary" />
                          ) : (
                            <Package className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.order_type === "fuel" ? "燃料订单" : "租赁订单"} · {formatDate(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground">{formatAmount(order.total_amount)}</span>
                        <Button size="sm" onClick={() => handleApplyClick(order)}>
                          申请开票
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* 开票申请表单（弹层/内联） */}
            {showForm && selectedOrder && (
              <Card semanticLevel="primary_fact" className="theme-card p-6 border-primary/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">开票信息</h3>
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setSelectedOrder(null) }}>
                    取消
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  订单号：{selectedOrder.order_number} · 金额：{formatAmount(selectedOrder.total_amount)}
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-2">
                    <Label>发票类型</Label>
                    <select
                      value={formData.invoice_type}
                      onChange={(e) => setFormData({ ...formData, invoice_type: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="normal">增值税普通发票（电子）</option>
                      <option value="special">增值税专用发票</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>抬头类型</Label>
                    <select
                      value={formData.title_type}
                      onChange={(e) => setFormData({ ...formData, title_type: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="personal">个人</option>
                      <option value="enterprise">企业</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{formData.title_type === "enterprise" ? "公司名称 *" : "抬头 *"}</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder={formData.title_type === "enterprise" ? "请输入公司全称" : "请输入姓名"}
                      required
                    />
                  </div>
                  {formData.title_type === "enterprise" && (
                    <div className="grid gap-2">
                      <Label>纳税人识别号 *</Label>
                      <Input
                        value={formData.tax_id}
                        onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                        placeholder="18位统一社会信用代码"
                        required
                      />
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label>注册地址</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="选填"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>注册电话</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="选填"
                    />
                  </div>
                  {formData.invoice_type === "special" && (
                    <>
                      <div className="grid gap-2">
                        <Label>开户银行 *</Label>
                        <Input
                          value={formData.bank_name}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                          placeholder="专票必填"
                          required={formData.invoice_type === "special"}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>银行账号 *</Label>
                        <Input
                          value={formData.bank_account}
                          onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                          placeholder="专票必填"
                          required={formData.invoice_type === "special"}
                        />
                      </div>
                    </>
                  )}
                  {formData.invoice_type === "normal" && (
                    <div className="grid gap-2">
                      <Label>收票邮箱</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="电子发票发送至"
                      />
                    </div>
                  )}
                  {submitError && (
                    <div className="text-sm text-destructive">{submitError}</div>
                  )}
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        提交中...
                      </>
                    ) : (
                      "提交申请"
                    )}
                  </Button>
                </form>
              </Card>
            )}
          </>
        )}

        {!needLogin && tab === "records" && (
          <Card semanticLevel="secondary_fact" className="theme-card p-4">
            {loadingInvoices ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>暂无发票记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border bg-muted/20 gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{inv.order_number || "—"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{inv.company_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatAmount(inv.amount)} · {formatDate(inv.created_at)}
                        </p>
                        {inv.invoice_number && (
                          <p className="text-xs text-primary mt-1">发票号：{inv.invoice_number}</p>
                        )}
                        {inv.invoice_file_url && inv.status === "issued" && (
                          <InvoiceDownloadActions invoiceId={inv.id} />
                        )}
                      </div>
                    </div>
                    <Badge variant={statusVariant[inv.status] || "secondary"}>
                      {statusLabel[inv.status] || inv.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
      <BottomNavigation />
    </main>
  )
}
