/**
 * 对公支付 - 获取供应商收款账户
 * GET /api/orders/corporate-payment-account?restaurant_id=xxx
 * 通过 restaurant_id → company_id 拉取所属供应商的 bank_name, bank_account, tax_id
 */

import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get("restaurant_id")
    const clientRestaurantId = request.headers.get("x-restaurant-id")

    // 客户端必须提供 restaurant_id（query 或 header）
    const rid = restaurantId || clientRestaurantId
    if (!rid?.trim()) {
      return NextResponse.json(
        { success: false, error: "缺少 restaurant_id" },
        { status: 400 }
      )
    }

    // 若使用 header，需与 query 一致
    if (restaurantId && clientRestaurantId && restaurantId !== clientRestaurantId) {
      return NextResponse.json(
        { success: false, error: "restaurant_id 不匹配" },
        { status: 403 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const { data: restaurantData, error: rErr } = await supabase
      .from("restaurants")
      .select("id, company_id")
      .eq("id", rid)
      .single()

    if (rErr || !restaurantData) {
      return NextResponse.json(
        { success: false, error: "餐厅不存在" },
        { status: 404 }
      )
    }

    const companyId = restaurantData.company_id
    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_NOT_CONFIGURED",
          error: "供应商尚未配置收款账户",
          details: "您的供应商暂未维护对公银行账户。请选择其他支付方式，或联系供应商在后台完善后重试。",
        },
        { status: 200 }
      )
    }

    const { data: companyData, error: cErr } = await supabase
      .from("companies")
      .select("id, name, bank_name, bank_account, tax_id")
      .eq("id", companyId)
      .single()

    if (cErr || !companyData) {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_NOT_CONFIGURED",
          error: "供应商尚未配置收款账户",
          details: "请联系您的供应商在后台完善收款账户信息后重试。",
        },
        { status: 200 }
      )
    }

    const hasAccount =
      (companyData.bank_name && companyData.bank_name.trim() !== "") &&
      (companyData.bank_account && companyData.bank_account.trim() !== "")

    if (!hasAccount) {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_NOT_CONFIGURED",
          error: "供应商尚未配置收款账户",
          details: "您的供应商已关联，但尚未填写开户行和银行账号。请选择其他支付方式，或联系供应商在后台完善后重试。",
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        company_name: companyData.name,
        bank_name: companyData.bank_name,
        bank_account: companyData.bank_account,
        tax_id: companyData.tax_id ?? undefined,
      },
    })
  } catch (error) {
    console.error("[对公收款账户API] 错误:", error)
    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
