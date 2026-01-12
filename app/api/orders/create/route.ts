// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，已使用 Anon Key，需完善 RLS

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { OrderStatus, ProductType } from "@/lib/types/order"

// POST: 创建订单并关联工人
export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      restaurant_id,
      worker_id,
      assigned_to, // 新字段：指派配送员ID
      service_type,
      product_type, // 新字段：产品类型
      status,
      amount,
    } = body

    // 验证必要参数
    if (!restaurant_id) {
      return NextResponse.json(
        { error: "缺少必要参数: restaurant_id" },
        { status: 400 }
      )
    }

    // worker_id 和 assigned_to 是可选的（客户提交时可能没有，管理员指派时才有）
    // 优先使用 assigned_to，如果没有则使用 worker_id（兼容旧字段）

    // 验证餐厅是否存在
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("id", restaurant_id)
      .single()

    if (restaurantError || !restaurantData) {
      return NextResponse.json(
        { error: "餐厅不存在" },
        { status: 404 }
      )
    }

    // 创建配送订单（表已分离，固定为 delivery_orders）
    // 初始状态必须为 'pending'，不接受其他值
    const orderData: any = {
      restaurant_id: restaurant_id,
      service_type: "燃料配送", // 固定值，因为表已分离
      status: "pending", // 统一初始状态为 pending，不接受 created / new / null 等值
      amount: amount || 0,
      customer_confirmed: false, // 默认未确认
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
      .select("id, restaurant_id, worker_id, assigned_to, product_type, service_type, status, amount, tracking_code, proof_image, customer_confirmed, created_at, updated_at")
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

