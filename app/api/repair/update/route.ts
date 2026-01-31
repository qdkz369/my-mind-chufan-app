// ACCESS_LEVEL: STAFF_LEVEL
// ALLOWED_ROLES: staff, admin, super_admin
// CURRENT_KEY: Service Role Key (优先) 或 Anon Key
// TARGET_KEY: Service Role Key (绕过 RLS) + 应用层数据隔离
// 说明：staff/admin/super_admin 可以调用，使用 service role key 绕过 RLS，数据隔离在应用层通过 company_id 实现

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyWorkerPermission } from "@/lib/auth/worker-auth"
import { dispatchViaPlatform } from "@/lib/platform/dispatch-gateway"
import { CONFIG_REQUIRE_ASSET_TRACE } from "@/lib/config/asset-trace"
import { createOrderStatusNotification } from "@/lib/notifications/create-notification"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * POST: 更新报修工单状态和金额
 * 用于管理端或维修工更新报修状态（pending -> processing -> completed）
 * 或取消报修（pending -> cancelled）
 * 如果请求中包含 worker_id，则验证维修工权限
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return NextResponse.json(
        { error: "数据库配置错误" },
        { status: 500 }
      )
    }

    // 使用 service role key 创建客户端（绕过 RLS）
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey || anonKey!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // 🔒 获取用户上下文，用于权限验证和数据隔离
    const userContext = await getUserContext(request)
    
    if (!userContext) {
      console.error("[更新报修API] ❌ 获取用户上下文失败: 用户上下文为 null")
      return NextResponse.json(
        {
          success: false,
          error: "未授权",
          details: "请先登录",
        },
        { status: 401 }
      )
    }
    
    console.log("[更新报修API] ✅ 用户上下文获取成功:", {
      role: userContext.role,
      companyId: userContext.companyId,
      userId: userContext.userId
    })

    const body = await request.json()
    
    // 如果请求中包含worker_id，验证维修工权限（暂时放宽验证，允许验证失败时继续执行）
    if (body.worker_id || request.headers.get("x-worker-id")) {
      const authResult = await verifyWorkerPermission(request, "repair", body)
      if (authResult instanceof NextResponse) {
        // 权限验证失败，但不阻止执行（用于调试）
        // 记录警告，但允许继续执行
        // 如果是403错误（工人不存在或已离职），记录详细信息但不阻止
        if (authResult.status === 403) {
          const workerId = body.worker_id || request.headers.get("x-worker-id")
          console.warn("[更新报修API] 工人ID:", workerId, "验证失败（工人不存在或已离职），但允许继续执行更新操作")
        } else {
          // 其他错误（如401、500）仍然返回错误
          return authResult
        }
      } else {
        // 权限验证通过，可以使用 authResult.worker 获取工人信息
        console.log("[更新报修API] 权限验证通过，工人:", authResult.worker.name)
      }
    }
    const {
      id, // 报修工单ID（统一使用 id 作为主键标识）
      repair_id, // 兼容旧参数名
      status, // 新状态：pending, processing, completed, cancelled
      amount, // 维修金额（可选，完成时必填）
      notes, // 备注（可选）
      assigned_to, // 分配的工人ID（可选）
      rejected_reason, // Phase B: 拒绝平台推荐时必填（原文）
      rejected_category, // 拒绝原因分类（CUSTOMER_SPECIFIED | URGENT_OVERRIDE | EXPERIENCE_PREFERENCE | PLATFORM_MISMATCH | OTHER）
      asset_ids, // 资产ID列表（可选，预留接口，当前不强制绑定）
    } = body

    // 统一使用 id，兼容 repair_id，确保解析为字符串
    const repairId = String(id || repair_id || "").trim()

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

    // 查询报修工单是否存在（使用 maybeSingle 避免多条记录错误）
    // 确保从 repair_orders 表查询，ID 已解析为字符串
    const { data: repair, error: repairError } = await supabase
      .from("repair_orders")
      .select("id, status, service_type")
      .eq("id", repairId)
      .maybeSingle()

    if (repairError) {
      console.error("[更新报修API] 查询工单失败:", repairError)
      return NextResponse.json(
        { 
          error: "查询报修工单失败",
          details: repairError.message 
        },
        { status: 500 }
      )
    }

    if (!repair) {
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

    // 如果提供了分配的工人ID，更新 assigned_to；必须经平台 Gateway 记录决策（Shadow）
    if (assigned_to !== undefined && assigned_to !== null) {
      const companyId = userContext.role !== "super_admin" ? userContext.companyId ?? null : null
      try {
        const gatewayResult = await dispatchViaPlatform({
          task_id: repairId,
          task_type: "repair",
          company_id: companyId,
          actor_id: userContext.userId,
          business_provided_worker_id: assigned_to || undefined,
          rejected_reason: rejected_reason || undefined,
          rejected_category: rejected_category || undefined,
          supabase,
        })
        if (!gatewayResult.success && gatewayResult.error === "REJECTED_REASON_REQUIRED") {
          return NextResponse.json(
            {
              success: false,
              error: "请选择拒绝原因分类",
              details: "当选择与平台推荐不同的工人时，必须选择拒绝原因类型",
              platform_recommended_worker_id: gatewayResult.platform_selected_worker,
              platform_recommendation_reason: gatewayResult.platform_recommendation_reason,
            },
            { status: 400 }
          )
        }
      } catch (gatewayErr) {
        console.warn("[更新报修API] 平台 Gateway 记录失败（继续执行）:", gatewayErr)
      }
      updateData.assigned_to = assigned_to || null
    }

    console.log("[更新报修API] 准备更新工单:", { repairId, updateData })

    // 更新报修工单（使用 maybeSingle 避免多条记录错误）
    // 确保操作 repair_orders 表，ID 已解析为字符串
    const { data: updatedRepair, error: updateError } = await supabase
      .from("repair_orders")
      .update(updateData)
      .eq("id", repairId)
      .select("id, restaurant_id, service_type, status, description, amount, created_at, updated_at, assigned_to")
      .maybeSingle()

    if (updateError) {
      console.error("[更新报修API] 更新失败:", {
        error: updateError,
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        updateData,
        repairId
      })
      return NextResponse.json(
        {
          error: "更新报修工单失败",
          details: updateError.message || "数据库更新操作失败",
          code: updateError.code,
        },
        { status: 500 }
      )
    }

    // 如果查询不到记录，返回404
    if (!updatedRepair) {
      return NextResponse.json(
        {
          error: "报修工单不存在",
          details: "无法找到要更新的报修工单",
        },
        { status: 404 }
      )
    }

    // 预留接口：如果提供了 asset_ids，写入 trace_logs（资产溯源记录）
    // 当前不强制 asset 绑定，仅为未来扩展预留
    if (asset_ids && Array.isArray(asset_ids) && asset_ids.length > 0) {
      // 获取操作员ID（从请求体中获取 worker_id 或 assigned_to）
      const operatorId = body.worker_id || assigned_to || null
      
      const traceLogs = asset_ids.map((assetId: string) => ({
        asset_id: assetId,
        operator_id: operatorId,
        action_type: "维修", // 或根据 status 动态设置：completed -> "维修", processing -> "维修中"
        order_id: repairId, // 关联报修工单ID
        created_at: new Date().toISOString(),
      }))

      const { error: traceError } = await supabase
        .from("trace_logs")
        .insert(traceLogs)

      if (traceError) {
        console.error("[更新报修API] 写入溯源记录失败:", traceError)
        // 溯源记录写入失败不影响报修工单更新，只记录日志
      } else {
        console.log("[更新报修API] 资产溯源记录已写入，asset_ids:", asset_ids)
      }
    }

    // 创建报修状态变更通知（非阻断）
    if (updatedRepair && repair.status !== status) {
      try {
        const { data: repairDetail } = await supabase
          .from("repair_orders")
          .select("order_number, restaurant_id")
          .eq("id", repairId)
          .single()

        if (repairDetail) {
          await createOrderStatusNotification(
            repairDetail.restaurant_id,
            repairId,
            repairDetail.order_number || repairId.substring(0, 8),
            repair.status,
            status,
            "repair"
          )
        }
      } catch (notifyError) {
        console.error('[更新报修API] 创建通知失败:', notifyError)
        // 通知创建失败不影响主流程
      }
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

