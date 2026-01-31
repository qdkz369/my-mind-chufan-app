"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Building2, Copy, Loader2, Upload, FileText, AlertCircle } from "lucide-react"
import Link from "next/link"

function CorporateResultContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get("order_id")
  const amount = searchParams.get("amount")
  const restaurantId = searchParams.get("restaurant_id")

  const [account, setAccount] = useState<{
    company_name: string
    bank_name: string
    bank_account: string
    tax_id?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [voucherUrl, setVoucherUrl] = useState<string | null>(null)
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    if (!restaurantId) {
      setError("缺少餐厅信息")
      setLoading(false)
      return
    }
    fetch(`/api/orders/corporate-payment-account?restaurant_id=${restaurantId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setAccount(data.data)
          setError(null)
        } else {
          setAccount(null)
          setError(data.code === "ACCOUNT_NOT_CONFIGURED" ? "ACCOUNT_NOT_CONFIGURED" : data.error || "获取收款账户失败")
        }
      })
      .catch(() => {
        setError("网络错误")
        setAccount(null)
      })
      .finally(() => setLoading(false))
  }, [restaurantId])

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setGeoLocation({ lat: p.coords.latitude, lon: p.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      )
    }
  }, [])

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const handleUploadVoucher = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orderId || !restaurantId) return
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    if (geoLocation) {
      formData.append("lat", String(geoLocation.lat))
      formData.append("lon", String(geoLocation.lon))
    }
    try {
      const res = await fetch(`/api/orders/${orderId}/upload-voucher`, {
        method: "POST",
        headers: { "x-restaurant-id": restaurantId },
        body: formData,
      })
      const data = await res.json()
      if (data.success && data.data?.voucher_url) {
        setVoucherUrl(data.data.voucher_url)
      } else {
        alert(data.error || "上传失败")
      }
    } catch {
      alert("上传失败")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  if (!orderId || !amount) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-6 bg-slate-900/90 border-slate-700">
            <p className="text-slate-400">缺少订单信息，请从支付页重新提交。</p>
            <Link href="/payment">
              <Button className="mt-4">返回支付页</Button>
            </Link>
          </Card>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3 text-green-400">
          <CheckCircle2 className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-bold text-white">订单已提交</h1>
            <p className="text-sm text-slate-400">请按以下信息完成对公转账</p>
          </div>
        </div>

        <Card className="p-6 bg-slate-900/90 border-slate-700 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">订单号</span>
            <span className="font-mono text-white">{orderId}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(orderId, "order")}
              className="text-slate-400 hover:text-white"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">转账金额</span>
            <span className="text-xl font-bold text-orange-400">¥{amount}</span>
          </div>
        </Card>

        {loading ? (
          <Card className="p-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </Card>
        ) : error ? (
          <Card className="p-6 bg-slate-900/90 border-amber-500/40">
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                <AlertCircle className="h-7 w-7 text-amber-400" />
              </div>
              <h3 className="text-lg font-medium text-amber-200">收款账户尚未配置</h3>
              <p className="text-sm text-slate-400 mt-2 max-w-sm">
                {error === "ACCOUNT_NOT_CONFIGURED"
                  ? "您的供应商暂未在后台维护对公银行账户。订单已成功提交，请稍后联系供应商获取打款信息，或选择其他支付方式重新下单。"
                  : "获取收款信息时遇到问题，请稍后重试或联系客服。"}
              </p>
              <p className="text-xs text-slate-500 mt-3">如有疑问，请联系您的供应商或客服人员。</p>
            </div>
          </Card>
        ) : account ? (
          <Card className="p-6 bg-slate-900/90 border-slate-700 space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Building2 className="h-5 w-5 text-amber-400" />
              收款账户信息
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">公司名称</span>
                <span className="text-white">{account.company_name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(account.company_name, "company")}
                  className="text-slate-400 hover:text-white"
                >
                  {copied === "company" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">开户行</span>
                <span className="text-white text-right flex-1 ml-2">{account.bank_name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(account.bank_name, "bank")}
                  className="text-slate-400 hover:text-white shrink-0"
                >
                  {copied === "bank" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">银行账号</span>
                <span className="font-mono text-white">{account.bank_account}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(account.bank_account, "account")}
                  className="text-slate-400 hover:text-white"
                >
                  {copied === "account" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm text-amber-200">
                <strong>打款备注：</strong>请务必在转账附言中填写订单号 <code className="font-mono">{orderId}</code>，以便财务核对
              </p>
            </div>
          </Card>
        ) : null}

        {/* 上传转账凭证 */}
        {account && (
          <Card className="p-6 bg-slate-900/90 border-slate-700">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
              <FileText className="h-5 w-5" />
              上传转账凭证
            </h2>
            <p className="text-sm text-slate-400 mb-4">完成转账后可上传回单截图，便于财务尽快确认</p>
            {voucherUrl ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>凭证已上传</span>
                <a href={voucherUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline text-sm">
                  查看
                </a>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 cursor-pointer hover:bg-slate-700">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                <span className="text-sm">{uploading ? "上传中..." : "选择图片或PDF"}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleUploadVoucher}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </Card>
        )}

        <div className="flex gap-3">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full border-slate-600 text-slate-300">
              返回首页
            </Button>
          </Link>
          <Link href="/payment" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600">
              继续下单
            </Button>
          </Link>
        </div>
      </div>
      <BottomNavigation />
    </main>
  )
}

export default function CorporateResultPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-white">加载中...</div>
          </div>
          <BottomNavigation />
        </main>
      }
    >
      <CorporateResultContent />
    </Suspense>
  )
}
