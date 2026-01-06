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

    // 构建查询 - 使用 ilike 匹配包含"维修"的订单
    // 先尝试包含 restaurants 关联查询
    let query = supabase
      .from("orders")
      .select(
        "id, restaurant_id, service_type, status, description, amount, urgency, contact_phone, created_at, updated_at, assigned_to, worker_id, restaurants(id, name, address, contact_phone, contact_name)"
      )
      .ilike("service_type", "%维修%") // 使用 ilike 匹配包含"维修"的订单
    
    // 调试：记录查询条件
    console.log("[报修列表API] 查询条件: service_type包含'维修'", status ? `status=${status}` : "", restaurantId ? `restaurant_id=${restaurantId}` : "")

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

    let { data: repairs, error } = await query.order("created_at", { ascending: false })

    // 如果关联查询失败（可能是 restaurants 表不存在或外键关系问题），尝试基础查询
    if (error && (error.message?.includes("restaurants") || error.code === "PGRST116" || error.code === "42P01")) {
      console.warn("[报修列表API] 关联查询失败，尝试基础查询:", error.message)
      
      // 重新构建基础查询（不包含 restaurants 关联）
      let baseQuery = supabase
        .from("orders")
        .select(
          "id, restaurant_id, service_type, status, description, amount, urgency, contact_phone, created_at, updated_at, assigned_to, worker_id"
        )
        .ilike("service_type", "%维修%")
      
      // 应用相同的筛选条件
      if (status) {
        baseQuery = baseQuery.eq("status", status)
      }
      if (restaurantId) {
        baseQuery = baseQuery.eq("restaurant_id", restaurantId)
      }
      const workerId = request.headers.get("x-worker-id")
      if (workerId && status && status !== "pending") {
        baseQuery = baseQuery.or(`assigned_to.eq.${workerId},worker_id.eq.${workerId}`)
      }
      
      const baseResult = await baseQuery.order("created_at", { ascending: false })
      
      if (baseResult.error) {
        console.error("[报修列表API] 基础查询也失败:", baseResult.error)
        return NextResponse.json(
          {
            error: "查询失败",
            details: baseResult.error.message,
          },
          { status: 500 }
        )
      }
      
      // 如果基础查询成功，手动获取餐厅信息
      repairs = baseResult.data
      if (repairs && repairs.length > 0) {
        const restaurantIds = [...new Set(repairs.map((r: any) => r.restaurant_id).filter(Boolean))]
        if (restaurantIds.length > 0) {
          const { data: restaurantsData } = await supabase
            .from("restaurants")
            .select("id, name, address, contact_phone, contact_name")
            .in("id", restaurantIds)
          
          // 将餐厅信息附加到每个订单
          if (restaurantsData) {
            const restaurantMap = new Map(restaurantsData.map((r: any) => [r.id, r]))
            repairs = repairs.map((repair: any) => ({
              ...repair,
              restaurants: restaurantMap.get(repair.restaurant_id) || null,
            }))
          }
        }
      }
    } else if (error) {
      console.error("[报修列表API] 查询失败:", error)
      console.error("[报修列表API] 错误详情:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
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
      console.log("[报修列表API] 成功找到维修订单，第一条记录:", {
        id: repairs[0].id,
        service_type: repairs[0].service_type,
        status: repairs[0].status,
        restaurant_id: repairs[0].restaurant_id,
        restaurant_name: repairs[0].restaurants?.name,
      })
    } else {
      // 如果没有结果，尝试查询所有订单看看 service_type 的实际值
      console.warn("[报修列表API] ⚠️ 未找到维修订单，诊断信息:")
      console.warn("查询条件: service_type包含'维修'", status ? `, status=${status}` : "", restaurantId ? `, restaurant_id=${restaurantId}` : "")
      
      const { data: allOrders, error: allOrdersError } = await supabase
        .from("orders")
        .select("id, service_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20)
      
      if (allOrdersError) {
        console.error("[报修列表API] 查询所有订单失败:", allOrdersError)
      } else if (allOrders && allOrders.length > 0) {
        console.warn("[报修列表API] 最近20条订单的 service_type 值:")
        allOrders.forEach((o: any) => {
          const isRepair = o.service_type && (o.service_type.includes("维修") || o.service_type === "维修服务")
          console.warn(`  - ID: ${o.id}, service_type: "${o.service_type}", status: ${o.status}${isRepair ? " ✓ (匹配)" : ""}`)
        })
        
        // 统计包含"维修"的订单数量
        const repairOrders = allOrders.filter((o: any) => 
          o.service_type && (o.service_type.includes("维修") || o.service_type === "维修服务")
        )
        console.warn(`[报修列表API] 在最近20条订单中，包含"维修"的订单数量: ${repairOrders.length}`)
      } else {
        console.warn("[报修列表API] 数据库中没有任何订单")
      }
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

