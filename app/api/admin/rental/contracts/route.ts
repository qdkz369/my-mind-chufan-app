/**
 * 租赁合同管理 API
 * 
 * GET: 获取租赁合同列表
 * POST: 创建新合同
 * 
 * 权限：仅 admin / super_admin 可访问
 * 说明：这是管理工具，不涉及业务流程、不展示金额、不关联订单/Facts
 * 
 * ⛔ 严格禁止事项：
 * 1. 禁止反向影响 Facts：不修改 Facts 表结构，不向 Facts API 添加字段
 * 2. 禁止判断设备可用性：不基于租赁状态判断设备是否可用
 * 3. 禁止引入 payment / settlement / invoice：不涉及支付、结算、发票逻辑
 * 4. 金额字段仅作记录：所有金额字段（agreed_daily_fee、agreed_monthly_fee）仅作记录，不做业务含义
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 获取租赁合同列表
 */
export async function GET(request: Request) {
  try {
    // 权限验证
    let userContext
    try {
      userContext = await getUserContext(request)
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      
      if (errorMessage.includes("未登录")) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录管理员账号",
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

    // 检查是否是管理员
    if (userContext.role !== "super_admin" && userContext.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "仅管理员可访问",
        },
        { status: 403 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "数据库连接失败" },
        { status: 500 }
      )
    }

    // 查询租赁合同列表
    const { data: contracts, error } = await supabase
      .from("rental_contracts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[租赁合同API] 查询失败:", error)
      return NextResponse.json(
        { success: false, error: "查询失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: contracts || [],
    })
  } catch (err: any) {
    console.error("[租赁合同API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}

/**
 * POST: 创建新合同
 */
export async function POST(request: Request) {
  try {
    // 权限验证
    let userContext
    try {
      userContext = await getUserContext(request)
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      
      if (errorMessage.includes("未登录")) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录管理员账号",
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

    // 检查是否是管理员
    if (userContext.role !== "super_admin" && userContext.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "仅管理员可访问",
        },
        { status: 403 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      contract_no,
      lessee_restaurant_id,
      lessor_type,
      lessor_id,
      start_at,
      end_at,
      billing_model,
      remark,
    } = body

    // 验证必需字段
    if (
      !contract_no ||
      !lessee_restaurant_id ||
      !lessor_type ||
      !lessor_id ||
      !start_at ||
      !end_at ||
      !billing_model
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "请填写所有必填项",
        },
        { status: 400 }
      )
    }

    // 验证日期
    const startDate = new Date(start_at)
    const endDate = new Date(end_at)
    if (endDate < startDate) {
      return NextResponse.json(
        {
          success: false,
          error: "日期无效",
          details: "结束日期不能早于开始日期",
        },
        { status: 400 }
      )
    }

    // 验证餐厅是否存在
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("id", lessee_restaurant_id)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        {
          success: false,
          error: "餐厅不存在",
          details: "请选择有效的餐厅",
        },
        { status: 404 }
      )
    }

    // 检查合同编号是否已存在
    const { data: existingContract, error: checkError } = await supabase
      .from("rental_contracts")
      .select("id")
      .eq("contract_no", contract_no)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 表示未找到记录，这是正常的
      console.error("[租赁合同API] 检查合同编号失败:", checkError)
      return NextResponse.json(
        {
          success: false,
          error: "检查合同编号失败",
          details: checkError.message,
        },
        { status: 500 }
      )
    }

    if (existingContract) {
      return NextResponse.json(
        {
          success: false,
          error: "合同编号已存在",
          details: "请使用不同的合同编号",
        },
        { status: 400 }
      )
    }

    // 创建合同
    const { data: contract, error: createError } = await supabase
      .from("rental_contracts")
      .insert({
        contract_no,
        lessee_restaurant_id,
        lessor_type,
        lessor_id,
        start_at,
        end_at,
        billing_model,
        status: "draft", // 新建合同默认为草稿状态
        remark: remark || null,
      })
      .select("*")
      .single()

    if (createError) {
      console.error("[租赁合同API] 创建失败:", createError)
      return NextResponse.json(
        {
          success: false,
          error: "创建失败",
          details: createError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: contract,
      message: "合同创建成功",
    })
  } catch (err: any) {
    console.error("[租赁合同API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
