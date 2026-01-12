// ACCESS_LEVEL: STAFF_LEVEL
// ALLOWED_ROLES: staff
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：只能 staff 调用，必须绑定 worker_id / assigned_to，后续必须使用 RLS 限制只能访问自己数据

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { ProductType } from "@/lib/types/order"
import { verifyWorkerPermission } from "@/lib/auth/worker-auth"

/**
 * GET: 获取待接单订单列表
 * 根据产品类型和配送员ID筛选
 * 如果请求头中包含 x-worker-id，则验证配送员权限
 */
export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    // 如果请求头中包含worker_id，验证配送员权限
    const headerWorkerId = request.headers.get("x-worker-id")
    if (headerWorkerId) {
      const authResult = await verifyWorkerPermission(request, "delivery")
      if (authResult instanceof NextResponse) {
        return authResult // 返回错误响应
      }
      console.log("[待接单订单API] 权限验证通过，配送员:", authResult.worker.name)
    }

    const { searchParams } = new URL(request.url)
    const productType = searchParams.get("product_type") // 产品类型筛选
    const queryWorkerId = searchParams.get("worker_id") // 配送员ID（可选，用于查看已接单的订单）

    // 构建查询（表已分离，直接查询 delivery_orders）
    // 查询 status = 'pending' 的订单，不额外叠加 worker_id / restaurant_id 限制
    // 注意：移除 restaurants 关联查询，避免多关系冲突
    // 如果需要餐厅信息，可以在客户端单独查询
    let query = supabase
      .from("delivery_orders")
      .select(
        "id, restaurant_id, product_type, service_type, status, amount, assigned_to, worker_id, tracking_code, proof_image, customer_confirmed, created_at, updated_at"
      )
      .eq("status", "pending") // 只查询 pending 状态的订单

    // 如果指定了产品类型，进行筛选
    if (productType) {
      query = query.eq("product_type", productType)
    }

    // 注意：根据要求，不额外叠加 worker_id / restaurant_id 限制
    // 只查询 status = 'pending' 的订单，除非 create 时已写入这些字段
    // 如果需要按配送员筛选，可以在客户端进行过滤

    const { data: orders, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[待接单订单API] 查询失败:", error)
      console.error("[待接单订单API] 错误详情:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return NextResponse.json(
        {
          error: "查询失败",
          details: error.message,
          hint: error.hint || "可能是RLS策略限制或表不存在",
        },
        { status: 500 }
      )
    }

    console.log("[待接单订单API] 查询成功，返回订单数量:", orders?.length || 0)
    if (orders && orders.length > 0) {
      console.log("[待接单订单API] 订单示例（第一条）:", {
        id: orders[0].id,
        status: orders[0].status,
        restaurant_id: orders[0].restaurant_id,
        product_type: orders[0].product_type,
      })
    } else {
      console.warn("[待接单订单API] 没有找到pending状态的订单")
    }

    return NextResponse.json({
      success: true,
      data: orders || [],
    })
  } catch (error) {
    console.error("[待接单订单API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

