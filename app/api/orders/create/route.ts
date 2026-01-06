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

    // 创建订单
    const orderData: any = {
      restaurant_id: restaurant_id,
      service_type: service_type || "燃料配送",
      status: status || "pending", // 默认状态为 pending（待处理），与管理端保持一致
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
    const deliveryWorkerId = assigned_to || worker_id
    if (deliveryWorkerId) {
      orderData.assigned_to = deliveryWorkerId
      orderData.worker_id = deliveryWorkerId // 兼容旧字段
      // 如果有配送员，状态设为 processing（处理中）
      if (!status) {
        orderData.status = "processing"
      }
    } else {
      // 如果没有配送员，状态设为 pending（待处理）
      if (!status) {
        orderData.status = "pending"
      }
    }

    const { data: newOrder, error: createError } = await supabase
      .from("orders")
      .insert(orderData)
      .select(
        "id, restaurant_id, worker_id, assigned_to, product_type, service_type, status, amount, tracking_code, proof_image, customer_confirmed, created_at, updated_at"
      )
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

    return NextResponse.json({
      success: true,
      message: "订单创建成功",
      data: newOrder,
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

