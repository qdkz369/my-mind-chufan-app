// 会员权益 API
// 认证：x-restaurant-id

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// 厨帆会员权益矩阵：燃料折扣 | 安全增值 | 金融赋能 | 服务响应
const TIERS = [
  {
    id: "bronze",
    name: "普通会员",
    minSpent: 0,
    maxSpent: 29999,
    fuel: "官方零售价",
    safety: "基础 IoT 安全预警",
    financial: "需预付/即时支付",
    service: "标准配送时效",
  },
  {
    id: "silver",
    name: "银卡会员",
    minSpent: 30000,
    maxSpent: 69999,
    fuel: "燃料 98 折",
    safety: "季度设备安全体检 (1次)",
    financial: "5,000 元初始授信",
    service: "标准配送时效",
  },
  {
    id: "gold",
    name: "金卡会员",
    minSpent: 70000,
    maxSpent: 99999,
    fuel: "燃料 95 折",
    safety: "隔月设备深度保养",
    financial: "授信额度提至 20,000 元",
    service: "优先配送",
  },
  {
    id: "platinum",
    name: "铂金会员",
    minSpent: 100000,
    maxSpent: 119999,
    fuel: "燃料 92 折",
    safety: "免费赠送 1 套智能传感器",
    financial: "优先开票处理（1小时内）",
    service: "1对1 专属管家",
  },
  {
    id: "diamond",
    name: "钻石会员",
    minSpent: 120000,
    maxSpent: Infinity,
    fuel: "协议成本价 + 少量服务费",
    safety: "24小时极速上门维修 (免工费)",
    financial: "无限额度账期 / 季度结清",
    service: "1对1 专属管家 + 极速配送",
  },
] as const

function getTier(totalSpent: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (totalSpent >= TIERS[i].minSpent) return TIERS[i]
  }
  return TIERS[0]
}

function getNextTier(currentTier: (typeof TIERS)[number]) {
  const idx = TIERS.findIndex((t) => t.id === currentTier.id)
  if (idx >= 0 && idx < TIERS.length - 1) return TIERS[idx + 1]
  return null
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.headers.get("x-restaurant-id")?.trim()
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录" },
        { status: 401 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !key) {
      return NextResponse.json({ success: false, error: "服务器配置错误" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .maybeSingle()

    if (!restaurant) {
      return NextResponse.json({ success: false, error: "未找到餐厅" }, { status: 404 })
    }

    const { data: orders } = await supabase
      .from("order_main")
      .select("total_amount")
      .eq("restaurant_id", restaurantId)
      .in("status", ["completed", "paid"])

    const totalSpent = (orders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
    const totalOrders = (orders || []).length

    const tier = getTier(totalSpent)
    const nextTier = getNextTier(tier)
    const progress = nextTier
      ? Math.min(100, Math.round(((totalSpent - tier.minSpent) / (nextTier.minSpent - tier.minSpent)) * 100))
      : 100
    const spentToNext = nextTier ? nextTier.minSpent - totalSpent : 0

    return NextResponse.json({
      success: true,
      data: {
        tier: {
          id: tier.id,
          name: tier.name,
          fuel: tier.fuel,
          safety: tier.safety,
          financial: tier.financial,
          service: tier.service,
        },
        total_spent: totalSpent,
        total_orders: totalOrders,
        progress,
        next_tier: nextTier
          ? { id: nextTier.id, name: nextTier.name, min_spent: nextTier.minSpent }
          : null,
        spent_to_next: nextTier ? Math.max(0, spentToNext) : 0,
      },
    })
  } catch (err: any) {
    console.error("[会员API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err?.message },
      { status: 500 }
    )
  }
}
