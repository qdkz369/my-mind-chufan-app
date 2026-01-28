// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，后续必须迁移到 Anon Key + RLS

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * POST: 创建产品库条目（供应商上传产品）
 * 请求体：
 * - provider_id: 供应商ID（必需）
 * - name: 产品名称（必需）
 * - brand: 品牌
 * - model: 型号
 * - description: 描述
 * - specifications: 规格（JSONB）
 * - images: 图片URL数组
 * - video_url: 视频URL（可选，用于设备展示视频）
 * - category_id: 分类ID
 * - monthly_rental_price: 月租金（必需）
 * - daily_rental_price: 日租金
 * - deposit_amount: 押金
 * - min_rental_period: 最短租期
 * - max_rental_period: 最长租期
 * - maintenance_included: 是否包含维护
 * - delivery_included: 是否包含配送
 * - notes: 备注
 */
export async function POST(request: Request) {
  try {
    // P0修复：强制使用统一用户上下文获取用户身份和权限
    let userContext
    try {
      userContext = await getUserContext(request)
      if (!userContext) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录",
          },
          { status: 401 }
        )
      }
      if (userContext.role === "super_admin") {
        console.log("[产品库创建API] Super Admin 访问，跳过多租户过滤")
      }
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      if (errorMessage.includes("未登录")) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录",
          },
          { status: 401 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: errorMessage,
        },
        { status: 403 }
      )
    }

    // P0修复：强制验证 companyId（super_admin 除外）
    if (!userContext.companyId && userContext.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "用户未关联任何公司",
        },
        { status: 403 }
      )
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      console.error("[产品库API] Supabase URL 或密钥未配置")
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase 密钥未配置",
        },
        { status: 500 }
      )
    }

    let supabaseClient: any

    if (serviceRoleKey) {
      supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    } else if (anonKey) {
      supabaseClient = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase 密钥未配置",
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      provider_id,
      name,
      brand,
      model,
      description,
      specifications,
      images = [],
      video_url,
      category_id,
      monthly_rental_price,
      daily_rental_price,
      deposit_amount = 0,
      min_rental_period = 1,
      max_rental_period,
      maintenance_included = true,
      delivery_included = false,
      notes,
    } = body

    // 验证必需字段
    if (!provider_id || !name || !monthly_rental_price) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "provider_id、name 和 monthly_rental_price 为必填项",
        },
        { status: 400 }
      )
    }

    // 创建产品库条目
    const catalogData: any = {
      provider_id,
      name,
      brand: brand || null,
      model: model || null,
      description: description || null,
      specifications: specifications || null,
      images: images || [],
      video_url: video_url || null,
      category_id: category_id || null,
      monthly_rental_price,
      daily_rental_price: daily_rental_price || null,
      deposit_amount,
      min_rental_period,
      max_rental_period: max_rental_period || null,
      maintenance_included,
      delivery_included,
      notes: notes || null,
      is_approved: false, // 默认未审核
      status: "pending", // 默认待审核
    }

    const { data, error } = await supabaseClient
      .from("equipment_catalog")
      .insert(catalogData)
      .select("*")
      .single()

    if (error) {
      console.error("[产品库API] 创建失败:", error)
      return NextResponse.json(
        {
          success: false,
          error: "创建产品失败",
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: "产品已提交，等待审核",
    })
  } catch (err: any) {
    console.error("[产品库API] 错误:", err)
    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误",
        details: err.message,
      },
      { status: 500 }
    )
  }
}


