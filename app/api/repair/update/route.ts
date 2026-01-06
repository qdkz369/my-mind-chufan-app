import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyWorkerPermission } from "@/lib/auth/worker-auth"

/**
 * POST: 更新报修工单状态和金额
 * 用于管理端或维修工更新报修状态（pending -> processing -> completed）
 * 或取消报修（pending -> cancelled）
 * 如果请求中包含 worker_id，则验证维修工权限
 */
export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    
    // 如果请求中包含worker_id，验证维修工权限
    if (body.worker_id || request.headers.get("x-worker-id")) {
      const authResult = await verifyWorkerPermission(request, "repair", body)
      if (authResult instanceof NextResponse) {
        return authResult // 返回错误响应
      }
      // 权限验证通过，可以使用 authResult.worker 获取工人信息
      console.log("[更新报修API] 权限验证通过，工人:", authResult.worker.name)
    }
    const {
      id, // 报修工单ID（统一使用 id 作为主键标识）
      repair_id, // 兼容旧参数名
      status, // 新状态：pending, processing, completed, cancelled
      amount, // 维修金额（可选，完成时必填）
      notes, // 备注（可选）
      assigned_to, // 分配的工人ID（可选）
    } = body

    // 统一使用 id，兼容 repair_id
    const repairId = id || repair_id

    if (!repairId) {
      return NextResponse.json(
        { error: "缺少必要参数: id" },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: "缺少必要参数: status" },
        { status: 400 }
      )
    }

    // 验证状态值
    const validStatuses = ["pending", "processing", "completed", "cancelled"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `无效的状态值: ${status}。有效值: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    // 如果状态是completed，必须提供金额
    if (status === "completed" && (amount === undefined || amount === null)) {
      return NextResponse.json(
        { error: "完成报修必须提供维修金额" },
        { status: 400 }
      )
    }

    // 查询报修工单是否存在
    const { data: repair, error: repairError } = await supabase
      .from("orders")
      .select("id, status, service_type")
      .eq("id", repairId)
      .eq("service_type", "维修服务") // 使用精确匹配
      .single()

    if (repairError || !repair) {
      return NextResponse.json(
        { error: "报修工单不存在" },
        { status: 404 }
      )
    }

    // 构建更新数据
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString(),
    }

    // 如果提供了金额，更新金额
    if (amount !== undefined && amount !== null) {
      updateData.amount = amount
    }

    // 如果提供了备注，更新备注（假设orders表有notes字段，如果没有则忽略）
    if (notes) {
      updateData.notes = notes
    }

    // 如果提供了分配的工人ID，更新 assigned_to 和 worker_id
    if (assigned_to !== undefined && assigned_to !== null) {
      updateData.assigned_to = assigned_to || null
      updateData.worker_id = assigned_to || null // 兼容旧字段
    }

    // 更新报修工单
    const { data: updatedRepair, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", repairId)
      .select("id, restaurant_id, service_type, status, description, amount, created_at, updated_at")
      .single()

    if (updateError) {
      console.error("[更新报修API] 更新失败:", updateError)
      return NextResponse.json(
        {
          error: "更新报修工单失败",
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "报修工单更新成功",
      data: updatedRepair,
    })
  } catch (error) {
    console.error("[更新报修API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

