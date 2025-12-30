import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

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
    const { restaurant_id, worker_id, service_type, status, amount } = body

    // 验证必要参数
    if (!restaurant_id) {
      return NextResponse.json(
        { error: "缺少必要参数: restaurant_id" },
        { status: 400 }
      )
    }

    // worker_id 是可选的（客户提交时可能没有，管理员指派时才有）

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
      status: status || "pending",
      amount: amount || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    // 如果有 worker_id，则添加
    if (worker_id) {
      orderData.worker_id = worker_id
    }

    const { data: newOrder, error: createError } = await supabase
      .from("orders")
      .insert(orderData)
      .select("id, restaurant_id, worker_id, service_type, status, created_at")
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

