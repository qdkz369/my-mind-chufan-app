// 资质认证 API
// 认证：x-restaurant-id（仅本人可读写，保护法人及企业信息）

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function resolveRestaurantId(request: NextRequest): string | null {
  return request.headers.get("x-restaurant-id")?.trim() || null
}

/**
 * GET: 获取当前餐厅的资质认证信息（仅本人）
 */
export async function GET(request: NextRequest) {
  const restaurantId = resolveRestaurantId(request)
  if (!restaurantId) {
    return NextResponse.json({ success: false, error: "未授权", details: "请先登录" }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ success: false, error: "服务器配置错误" }, { status: 500 })
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .maybeSingle()

  if (!restaurant) {
    return NextResponse.json({ success: false, error: "未找到餐厅" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("restaurant_certifications")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .maybeSingle()

  if (error) {
    console.error("[资质认证API] 查询失败:", error)
    return NextResponse.json({ success: false, error: "查询失败", details: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data || null })
}

/**
 * PUT: 保存/更新资质认证（仅本人，保护敏感字段不落日志）
 */
export async function PUT(request: NextRequest) {
  const restaurantId = resolveRestaurantId(request)
  if (!restaurantId) {
    return NextResponse.json({ success: false, error: "未授权", details: "请先登录" }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ success: false, error: "服务器配置错误" }, { status: 500 })
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .maybeSingle()

  if (!restaurant) {
    return NextResponse.json({ success: false, error: "未找到餐厅" }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "请求体格式错误" }, { status: 400 })
  }

  const allowed = [
    "legal_rep_name", "legal_rep_id_number", "legal_rep_phone",
    "company_name", "unified_social_credit_code", "registered_address", "business_scope",
    "business_license_url", "food_license_url", "status",
  ] as const
  const payload: Record<string, unknown> = { restaurant_id: restaurantId }
  for (const k of allowed) {
    if (body[k] !== undefined) payload[k] = body[k]
  }
  if (typeof payload.status === "string" && !["draft", "pending", "approved", "rejected"].includes(payload.status)) {
    delete payload.status
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("restaurant_certifications")
    .upsert(payload, {
      onConflict: "restaurant_id",
      ignoreDuplicates: false,
    })
    .select()
    .single()

  if (upsertError) {
    console.error("[资质认证API] 保存失败:", upsertError.message)
    return NextResponse.json({ success: false, error: "保存失败", details: upsertError.message }, { status: 500 })
  }

  await supabase.from("audit_logs").insert({
    actor_id: null,
    action: "CERTIFICATION_UPDATED",
    target_type: "restaurant_certification",
    target_id: upserted?.id ?? restaurantId,
    metadata: { restaurant_id: restaurantId, updated_at: new Date().toISOString() },
    created_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true, data: upserted })
}
