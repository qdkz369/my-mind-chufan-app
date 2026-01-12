/**
 * Usage Snapshot 管理 API
 * 
 * GET: 获取 Usage Snapshot 列表（只读）
 * PATCH: 更新 Snapshot 状态（仅允许标记 disputed / locked）
 * 
 * 权限：仅 admin / super_admin 可访问
 * 说明：这是只读查看页，不允许编辑 usage_value，不展示任何金额字段
 * 
 * ⛔ Usage Snapshot 阶段明确禁止事项（非常重要）：
 * 1. 禁止生成账单：禁止基于 Usage Snapshot 生成账单（bill/invoice）
 * 2. 禁止生成应收应付：禁止基于 Usage Snapshot 生成应收/应付
 * 3. 禁止计算金额：禁止基于 usage_value 计算任何金额
 * 4. 禁止对订单状态产生任何反向影响：禁止基于 Snapshot 修改订单状态、阻止订单创建、触发订单流程变更
 * 5. 禁止在 Snapshot 中修改或纠正 Facts：禁止修改 Facts 数据、纠正 Facts 值、反向更新 Facts 表
 * 
 * ⛔ 其他严格禁止事项：
 * 6. 禁止反向影响 Facts：不修改 Facts 表结构，不向 Facts API 添加字段
 * 7. 禁止判断设备可用性：不基于租赁状态判断设备是否可用
 * 8. 禁止引入 payment / settlement / invoice：不涉及支付、结算、发票逻辑
 * 9. 禁止编辑 usage_value：usage_value 是冻结的事实，不允许修改
 * 10. 禁止展示金额字段：不展示任何金额相关字段
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 获取 Usage Snapshot 列表（只读）
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

    // 查询 Usage Snapshot 列表
    // 关联查询设备信息和合同信息（仅用于展示，不涉及金额）
    const { data: snapshots, error } = await supabase
      .from("usage_snapshots")
      .select(`
        id,
        device_id,
        rental_contract_id,
        usage_metric,
        usage_value,
        snapshot_start_at,
        snapshot_end_at,
        status,
        fact_source,
        generated_from_fact_at,
        created_at,
        updated_at,
        devices:device_id (
          device_id,
          model
        ),
        rental_contracts:rental_contract_id (
          id,
          contract_no
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Usage Snapshot API] 查询失败:", error)
      return NextResponse.json(
        { success: false, error: "查询失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: snapshots || [],
    })
  } catch (err: any) {
    console.error("[Usage Snapshot API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH: 更新 Snapshot 状态（仅允许标记 disputed / locked）
 */
export async function PATCH(request: Request) {
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
    const { id, status } = body

    // 验证必需字段
    if (!id || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "请提供 id 和 status",
        },
        { status: 400 }
      )
    }

    // 验证状态值：仅允许 disputed 或 locked
    if (status !== "disputed" && status !== "locked") {
      return NextResponse.json(
        {
          success: false,
          error: "状态值无效",
          details: "仅允许标记为 disputed 或 locked",
        },
        { status: 400 }
      )
    }

    // 验证快照是否存在
    const { data: existingSnapshot, error: fetchError } = await supabase
      .from("usage_snapshots")
      .select("id, status")
      .eq("id", id)
      .single()

    if (fetchError || !existingSnapshot) {
      return NextResponse.json(
        {
          success: false,
          error: "快照不存在",
          details: "请提供有效的快照 ID",
        },
        { status: 404 }
      )
    }

    // 如果已经是 locked 状态，不允许修改
    if (existingSnapshot.status === "locked") {
      return NextResponse.json(
        {
          success: false,
          error: "快照已锁定",
          details: "locked 状态的快照不允许修改",
        },
        { status: 400 }
      )
    }

    // 更新状态
    const { data: updatedSnapshot, error: updateError } = await supabase
      .from("usage_snapshots")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[Usage Snapshot API] 更新失败:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: "更新失败",
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedSnapshot,
      message: "状态更新成功",
    })
  } catch (err: any) {
    console.error("[Usage Snapshot API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
