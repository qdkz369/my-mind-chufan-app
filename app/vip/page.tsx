"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Star, Loader2, Check, Gift, ChevronDown } from "lucide-react"
import Link from "next/link"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface MembershipData {
  tier: {
    id: string
    name: string
    fuel: string
    safety: string
    financial: string
    service: string
  }
  total_spent: number
  total_orders: number
  progress: number
  next_tier: { id: string; name: string; min_spent: number } | null
  spent_to_next: number
}

// 厨帆会员权益矩阵（用于等级说明对比表）
const BENEFIT_MATRIX = [
  { id: "bronze", name: "普通会员", badge: "🥉", threshold: "¥0 起", fuel: "官方零售价", safety: "基础 IoT 安全预警", financial: "需预付/即时支付" },
  { id: "silver", name: "银卡会员", badge: "🥈", threshold: "¥30,000", fuel: "燃料 98 折", safety: "季度设备安全体检 (1次)", financial: "5,000 元初始授信" },
  { id: "gold", name: "金卡会员", badge: "👑", threshold: "¥70,000", fuel: "燃料 95 折", safety: "隔月设备深度保养", financial: "授信额度 20,000 元" },
  { id: "platinum", name: "铂金会员", badge: "✨", threshold: "¥100,000", fuel: "燃料 92 折", safety: "免费赠送 1 套智能传感器", financial: "优先开票（1小时内）" },
  { id: "diamond", name: "钻石会员", badge: "💎", threshold: "¥120,000", fuel: "协议成本价 + 少量服务费", safety: "24h 极速上门维修 (免工费)", financial: "无限额度账期 / 季度结清" },
]

const tierConfig: Record<
  string,
  { color: string; bg: string; icon: string; gradient: string }
> = {
  bronze: {
    color: "text-amber-600",
    bg: "bg-amber-500/20 border-amber-500/30",
    icon: "🥉",
    gradient: "from-amber-600/20 to-amber-800/10",
  },
  silver: {
    color: "text-slate-400",
    bg: "bg-slate-400/20 border-slate-400/30",
    icon: "🥈",
    gradient: "from-slate-400/20 to-slate-600/10",
  },
  gold: {
    color: "text-amber-400",
    bg: "bg-amber-400/20 border-amber-400/30",
    icon: "👑",
    gradient: "from-amber-400/20 to-amber-600/10",
  },
  platinum: {
    color: "text-slate-200",
    bg: "bg-slate-300/20 border-slate-300/30",
    icon: "✨",
    gradient: "from-slate-300/20 to-slate-500/10",
  },
  diamond: {
    color: "text-cyan-300",
    bg: "bg-cyan-400/20 border-cyan-400/30",
    icon: "💎",
    gradient: "from-cyan-400/20 to-blue-600/10",
  },
}

export default function VipPage() {
  const [needLogin, setNeedLogin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MembershipData | null>(null)
  const [expandedTierId, setExpandedTierId] = useState<string | null>(null)

  const getHeaders = (): HeadersInit => {
    const h: HeadersInit = {}
    const rid = typeof window !== "undefined" ? localStorage.getItem("restaurantId") : null
    if (rid) h["x-restaurant-id"] = rid
    return h
  }

  useEffect(() => {
    const rid = typeof window !== "undefined" ? localStorage.getItem("restaurantId") : null
    if (!rid) {
      setNeedLogin(true)
      setLoading(false)
      return
    }
    setNeedLogin(false)
    setLoading(true)
    fetchWithAuth("/api/membership", { credentials: "include", headers: getHeaders() })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setData(json.data)
        else setData(null)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const formatAmount = (v: number) =>
    new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(v)

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
          <h1 className="text-2xl font-bold text-foreground mb-2">会员权益</h1>
          <p className="text-sm text-muted-foreground">消费越多，等级越高，权益越丰富</p>
        </div>

        {needLogin ? (
          <Card semanticLevel="secondary_fact" className="theme-card p-6">
            <p className="text-muted-foreground text-center mb-4">请先登录后查看会员权益</p>
            <Link href="/profile">
              <button className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                去登录
              </button>
            </Link>
          </Card>
        ) : loading ? (
          <Card semanticLevel="secondary_fact" className="theme-card p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </Card>
        ) : data ? (
          <div className="space-y-6">
            <Card
              semanticLevel="primary_fact"
              className={`theme-card overflow-hidden border-0 bg-gradient-to-br ${tierConfig[data.tier.id]?.gradient || tierConfig.bronze.gradient}`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl shrink-0 border ${tierConfig[data.tier.id]?.bg || "bg-muted border-border"}`}
                    >
                      {tierConfig[data.tier.id]?.icon || "🥉"}
                    </span>
                    <div>
                      <h2 className={`text-xl font-bold ${tierConfig[data.tier.id]?.color || "text-foreground"}`}>
                        {data.tier.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">{data.tier.fuel}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">累计消费</p>
                    <p className="font-semibold text-foreground">{formatAmount(data.total_spent)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">累计订单</p>
                    <p className="font-semibold text-foreground">{data.total_orders} 单</p>
                  </div>
                </div>
                {data.next_tier && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1.5">
                        升级至
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${tierConfig[data.next_tier.id]?.bg || "bg-muted"}`}>
                          {tierConfig[data.next_tier.id]?.icon || "⭐"}
                        </span>
                        {data.next_tier.name}
                      </span>
                      <span>还需消费 {formatAmount(data.spent_to_next)}</span>
                    </div>
                    <Progress value={data.progress} className="h-2" />
                  </div>
                )}
                {!data.next_tier && (
                  <p className="mt-4 text-sm text-muted-foreground">您已是最高等级会员</p>
                )}
              </div>
            </Card>

            <Card semanticLevel="secondary_fact" className="theme-card p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                当前权益
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span><span className="text-muted-foreground">燃料：</span>{data.tier.fuel}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span><span className="text-muted-foreground">安全增值：</span>{data.tier.safety}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span><span className="text-muted-foreground">金融财务：</span>{data.tier.financial}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span><span className="text-muted-foreground">服务响应：</span>{data.tier.service}</span>
                </div>
              </div>
            </Card>

            <Card semanticLevel="secondary_fact" className="theme-card p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                会员等级说明
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                点击等级查看详细权益
              </p>
              <div className="space-y-1">
                {BENEFIT_MATRIX.map((row) => (
                  <Collapsible
                    key={row.id}
                    open={expandedTierId === row.id}
                    onOpenChange={(open) => setExpandedTierId(open ? row.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className={`w-full flex items-center justify-between gap-3 py-3 px-3 rounded-lg text-left transition-colors hover:bg-muted/50 [&[data-state=open]]:bg-muted/50 ${expandedTierId === row.id ? "bg-muted/50" : ""}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-lg shrink-0 ${tierConfig[row.id]?.bg || "bg-muted"} ${tierConfig[row.id]?.color || "text-foreground"}`}
                          >
                            {row.badge}
                          </span>
                          <span className="font-medium text-foreground">{row.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm text-muted-foreground">{row.threshold}</span>
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandedTierId === row.id ? "rotate-180" : ""}`}
                          />
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 duration-200">
                      <div className="px-3 pb-4 pt-1 ml-4 pl-6 space-y-2.5 text-sm border-l-2 border-muted">
                          <div>
                            <span className="text-muted-foreground">燃料：</span>
                            <span className="text-foreground">{row.fuel}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">安全增值：</span>
                            <span className="text-foreground">{row.safety}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">金融财务：</span>
                            <span className="text-foreground">{row.financial}</span>
                          </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                会员等级按累计消费自动计算，完成订单并支付后生效。
              </p>
            </Card>
          </div>
        ) : (
          <Card semanticLevel="secondary_fact" className="theme-card p-6">
            <p className="text-muted-foreground text-center">加载失败，请刷新重试</p>
          </Card>
        )}
      </div>
      <BottomNavigation />
    </main>
  )
}
