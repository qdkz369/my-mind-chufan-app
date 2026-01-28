// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，已使用 Anon Key，需完善 RLS

import { NextResponse, NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { OrderStatus, ProductType } from "@/lib/types/order"

// POST: 创建订单并关联工人
export async function POST(request: NextRequest) {
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
        console.log("[创建燃料订单API] Super Admin 访问，跳过多租户过滤")
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
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      order_number, // 自动生成的订单号
      restaurant_id,
      worker_id,
      assigned_to, // 新字段：指派配送员ID
      service_type,
      product_type, // 新字段：产品类型
      status,
      amount,
      total_amount, // 总金额（与amount一致）
      contact_name, // 联系人姓名
      contact_phone, // 联系电话
      delivery_address, // 配送地址
      notes, // 备注信息
    } = body

    // 增强参数验证和调试信息
    console.log('[创建订单API] 📥 接收到请求参数:', {
      order_number,
      restaurant_id,
      product_type,
      total_amount: total_amount || amount,
      contact_name,
      contact_phone,
      delivery_address,
      hasNotes: !!notes
    })

    // 验证必要参数
    if (!restaurant_id) {
      console.error('[创建订单API] ❌ 缺少 restaurant_id')
      return NextResponse.json(
        { 
          error: "缺少必要参数：餐厅ID", 
          details: "请确保已正确获取餐厅信息后再提交"
        },
        { status: 400 }
      )
    }

    // 验证订单号
    if (!order_number) {
      console.error('[创建订单API] ❌ 缺少 order_number')
      return NextResponse.json(
        { 
          error: "缺少订单号", 
          details: "请确保订单号已正确生成"
        },
        { status: 400 }
      )
    }

    // worker_id 和 assigned_to 是可选的（客户提交时可能没有，管理员指派时才有）
    // 优先使用 assigned_to，如果没有则使用 worker_id（兼容旧字段）

    // 验证餐厅是否存在，并获取 company_id
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, company_id")
      .eq("id", restaurant_id)
      .single()

    if (restaurantError || !restaurantData) {
      return NextResponse.json(
        { error: "餐厅不存在" },
        { status: 404 }
      )
    }

    // 🔒 统一 company_id 来源：优先使用 getUserContext，其次从 restaurants 表获取
    const companyId = userContext?.companyId || restaurantData.company_id

    // 创建配送订单（表已分离，固定为 delivery_orders）
    // 初始状态必须为 'pending'，不接受其他值
    const orderData: any = {
      restaurant_id: restaurant_id,
      service_type: service_type || "燃料配送", // 允许自定义服务类型描述
      status: "pending", // 统一初始状态为 pending，不接受 created / new / null 等值
      amount: total_amount || amount || 0,
      total_amount: total_amount || amount || 0, // 确保总金额字段
      customer_confirmed: false, // 默认未确认
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 添加订单号（如果提供）
    if (order_number) {
      orderData.order_number = order_number
    }

    // 添加联系信息
    if (contact_name) {
      orderData.contact_name = contact_name
    }
    if (contact_phone) {
      orderData.contact_phone = contact_phone
    }
    if (delivery_address) {
      orderData.delivery_address = delivery_address
    }
    if (notes) {
      orderData.notes = notes
    }

    // 添加产品类型（如果提供）
    if (product_type) {
      orderData.product_type = product_type
    }

    // 添加配送员ID（优先使用 assigned_to，兼容 worker_id）
    // 注意：即使有配送员，初始状态仍为 pending，需要通过 accept 接口接单
    const deliveryWorkerId = assigned_to || worker_id
    if (deliveryWorkerId) {
      orderData.assigned_to = deliveryWorkerId
      orderData.worker_id = deliveryWorkerId // 兼容旧字段
    }

    // 插入订单并返回真实写入的 id（使用 .single() 确保只返回一条记录）
    const { data: newOrder, error: createError } = await supabase
      .from("delivery_orders")
      .insert(orderData)
      .select("id, restaurant_id, worker_id, assigned_to, product_type, service_type, status, amount, total_amount, tracking_code, proof_image, customer_confirmed, created_at, updated_at, order_number")
      .single()

    if (createError) {
      console.error("[创建订单API] 创建订单失败:", createError)
      return NextResponse.json(
        {
          error: "创建订单失败",
          details: createError.message,
        },
        { status: 500 }
      )
    }

    // 确保返回真实写入的 id（禁止返回客户端传入的伪 id）
    if (!newOrder || !newOrder.id) {
      console.error("[创建订单API] 创建成功但未返回 id")
      return NextResponse.json(
        {
          error: "创建订单失败",
          details: "订单创建成功但未返回有效的订单ID",
        },
        { status: 500 }
      )
    }

    // 📝 影子写入：同步写入 order_main 表
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && (serviceRoleKey || anonKey)) {
        const adminClient = createClient(
          supabaseUrl,
          serviceRoleKey || anonKey!,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          }
        )

        // 使用传入的订单号，如果没有则生成一个
        const orderNumber = newOrder.order_number || order_number || `FUEL${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

        // 创建 order_main 记录
        const { data: mainOrder, error: mainOrderError } = await adminClient
          .from("order_main")
          .insert({
            order_number: orderNumber,
            order_type: "fuel",
            company_id: companyId || null,
            status: newOrder.status || "pending",
            total_amount: newOrder.total_amount || newOrder.amount || 0,
            fuel_order_id: newOrder.id,
            rental_order_id: null,
            restaurant_id: restaurant_id,
            user_id: userContext?.userId || null,
            notes: notes || null,
            created_at: newOrder.created_at || new Date().toISOString(),
          })
          .select("id")
          .single()

        if (mainOrder && mainOrder.id) {
          // 更新 delivery_orders 表的 main_order_id
          const { error: updateError } = await adminClient
            .from("delivery_orders")
            .update({ main_order_id: mainOrder.id })
            .eq("id", newOrder.id)

          if (updateError) {
            console.error("[创建订单API] 更新 delivery_orders.main_order_id 失败:", updateError)
          } else {
            console.log(`[创建订单API] ✅ 影子写入成功：order_main.id = ${mainOrder.id}, delivery_orders.id = ${newOrder.id}`)
          }
        } else if (mainOrderError) {
          console.error("[创建订单API] 影子写入 order_main 失败:", mainOrderError)
          // 影子写入失败不影响主流程，只记录错误
        }
      }
    } catch (shadowWriteError) {
      console.error("[创建订单API] 影子写入异常（不影响主流程）:", shadowWriteError)
      // 影子写入失败不影响主流程
    }

    return NextResponse.json({
      success: true,
      message: "订单创建成功",
      data: newOrder, // 包含真实写入的 id
    })
  } catch (error) {
    console.error("[创建订单API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

