import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyWorkerPermission } from "@/lib/auth/worker-auth"

/**
 * GET: 获取报修工单列表
 * 支持按状态筛选，用于管理端或维修工查看
 * 如果请求头中包含 x-worker-id，则验证维修工权限
 */
export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // 状态筛选：pending, processing, completed, cancelled
    const restaurantId = searchParams.get("restaurant_id") // 餐厅ID筛选（可选）

    // 构建查询 - 使用 ilike 进行模糊匹配，兼容可能的变体
    let query = supabase
      .from("orders")
      .select(
        "id, restaurant_id, service_type, status, description, amount, urgency, contact_phone, created_at, updated_at, assigned_to, worker_id, restaurants(id, name, address, contact_phone, contact_name)"
      )
      .or("service_type.ilike.%维修%,service_type.eq.维修服务") // 使用 ilike 匹配包含"维修"的订单，或精确匹配"维修服务"
    
    // 调试：记录查询条件
    console.log("[报修列表API] 查询条件: service_type包含'维修'", status ? `status=${status}` : "")

    // 如果请求头中包含worker_id，验证维修工权限
    const workerId = request.headers.get("x-worker-id")
    if (workerId) {
      const authResult = await verifyWorkerPermission(request, "repair")
      if (authResult instanceof NextResponse) {
        return authResult // 返回错误响应
      }
      console.log("[报修列表API] 权限验证通过，工人:", authResult.worker.name)
      
      // 如果提供了worker_id，根据状态筛选：
      // - pending: 显示所有待处理的工单（无论是否分配）
      // - 其他状态: 只显示分配给该工人的工单
      if (status && status !== "pending") {
        // 其他状态：只显示分配给该工人的工单
        query = query.or(`assigned_to.eq.${workerId},worker_id.eq.${workerId}`)
      }
      // pending 状态不添加额外筛选，显示所有待处理的工单
    }

    // 状态筛选
    if (status) {
      query = query.eq("status", status)
    }

    // 餐厅筛选
    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId)
    }

    const { data: repairs, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[报修列表API] 查询失败:", error)
      return NextResponse.json(
        {
          error: "查询失败",
          details: error.message,
        },
        { status: 500 }
      )
    }

    // 调试：记录查询结果
    console.log("[报修列表API] 查询结果数量:", repairs?.length || 0)
    if (repairs && repairs.length > 0) {
      console.log("[报修列表API] 第一条记录:", {
        id: repairs[0].id,
        service_type: repairs[0].service_type,
        status: repairs[0].status,
      })
    }

    return NextResponse.json({
      success: true,
      data: repairs || [],
    })
  } catch (error) {
    console.error("[报修列表API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

