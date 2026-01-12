/**
 * 内部 API：生成 Usage Snapshot（计费前快照）
 * 
 * POST /api/internal/usage-snapshot/generate
 * 
 * ⚠️ 这是一个内部 API，不是给前端点的
 * 
 * 行为：
 * 1. 输入：rental_contract_id, device_id, snapshot_start_at, snapshot_end_at
 * 2. 查询 Facts API（只读）获取该设备在时间窗口内的使用统计
 * 3. 生成一条 usage_snapshots 记录
 * 4. 返回 snapshot_id
 * 
 * 约束：
 * - 不做金额计算
 * - 不判断合同有效性（假设上层已校验）
 * - 仅允许 system / admin 权限调用
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
 * 9. usage_value 只是"量"（使用量），不是"钱"（金额）
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getUserContext } from "@/lib/auth/user-context"

export async function POST(request: Request) {
  try {
    // 权限验证：仅允许 system / admin 权限调用
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

    // 检查是否是管理员（system 通过 super_admin 或 admin 角色实现）
    if (userContext.role !== "super_admin" && userContext.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "仅管理员或系统可调用此 API",
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
    const {
      rental_contract_id,
      device_id,
      snapshot_start_at,
      snapshot_end_at,
      usage_metric, // 可选，如果不提供则从合同设备关系中获取
      fact_source = "device_facts", // 默认来源：device_facts
    } = body

    // 验证必需字段
    if (!rental_contract_id || !device_id || !snapshot_start_at || !snapshot_end_at) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "请提供：rental_contract_id, device_id, snapshot_start_at, snapshot_end_at",
        },
        { status: 400 }
      )
    }

    // 验证时间范围
    const startTime = new Date(snapshot_start_at).getTime()
    const endTime = new Date(snapshot_end_at).getTime()
    if (endTime <= startTime) {
      return NextResponse.json(
        {
          success: false,
          error: "时间范围无效",
          details: "结束时间必须晚于开始时间",
        },
        { status: 400 }
      )
    }

    // 1. 查询合同设备关系，获取 usage_metric（如果未提供）
    let finalUsageMetric: 'hours' | 'orders' | 'energy' | 'hybrid' = 'hours'
    if (usage_metric) {
      finalUsageMetric = usage_metric
    } else {
      const { data: contractDevice, error: contractDeviceError } = await supabase
        .from("rental_contract_devices")
        .select("agreed_usage_metric")
        .eq("rental_contract_id", rental_contract_id)
        .eq("device_id", device_id)
        .maybeSingle()

      if (contractDeviceError) {
        console.warn("[Usage Snapshot API] 查询合同设备关系失败:", contractDeviceError)
      }

      if (contractDevice?.agreed_usage_metric) {
        finalUsageMetric = contractDevice.agreed_usage_metric as 'hours' | 'orders' | 'energy' | 'hybrid'
      }
    }

    // 2. 查询 Facts（只读）获取设备在时间窗口内的使用统计
    // 注意：这里只查询 Facts 表，不修改 Facts，不涉及金额计算
    let usageValue = 0
    let generatedFromFactAt = new Date().toISOString()

    try {
      // 先获取设备的 restaurant_id（用于查询订单事实）
      const { data: deviceData, error: deviceError } = await supabase
        .from("devices")
        .select("restaurant_id")
        .eq("device_id", device_id)
        .maybeSingle()

      if (deviceError) {
        console.warn("[Usage Snapshot API] 查询设备信息失败:", deviceError)
      }

      const restaurantId = deviceData?.restaurant_id

      // 根据 usage_metric 选择不同的 Facts 查询方式
      if (finalUsageMetric === 'orders') {
        // 查询订单事实：统计时间窗口内的订单数量（只读）
        if (restaurantId) {
          const { data: ordersData, error: ordersError } = await supabase
            .from("delivery_orders")
            .select("id, created_at")
            .eq("restaurant_id", restaurantId)
            .gte("created_at", snapshot_start_at)
            .lte("created_at", snapshot_end_at)
            .eq("status", "completed")

          if (ordersError) {
            console.warn("[Usage Snapshot API] 查询订单事实失败:", ordersError)
          } else if (ordersData) {
            usageValue = ordersData.length
            // 获取最新订单时间
            if (ordersData.length > 0) {
              const latestOrder = ordersData.reduce((latest, order) => {
                return new Date(order.created_at) > new Date(latest.created_at) ? order : latest
              })
              generatedFromFactAt = latestOrder.created_at
            }
          }
        }
      } else if (finalUsageMetric === 'energy') {
        // 查询设备事实：统计时间窗口内的能耗值（只读）
        // 从 fuel_level 表查询燃料变化（这是设备事实数据）
        const { data: fuelData, error: fuelError } = await supabase
          .from("fuel_level")
          .select("percentage, created_at")
          .eq("device_id", device_id)
          .gte("created_at", snapshot_start_at)
          .lte("created_at", snapshot_end_at)
          .order("created_at", { ascending: true })

        if (fuelError) {
          console.warn("[Usage Snapshot API] 查询燃料事实失败:", fuelError)
        } else if (fuelData && fuelData.length > 1) {
          // 计算能耗变化（只计算"量"，不涉及金额）
          // 假设满罐为100%，转换为能耗值（简化计算，仅作示例）
          const firstLevel = fuelData[0].percentage || 0
          const lastLevel = fuelData[fuelData.length - 1].percentage || 0
          usageValue = Math.max(0, (firstLevel - lastLevel) * 5) // 转换为能耗值（简化）
          generatedFromFactAt = fuelData[fuelData.length - 1].created_at
        }
      } else if (finalUsageMetric === 'hours') {
        // 查询设备事实：统计时间窗口内的小时数（只读）
        // 计算时间窗口的小时数（这是"量"，不是"钱"）
        const hoursDiff = (endTime - startTime) / (1000 * 60 * 60)
        usageValue = Math.max(0, hoursDiff)
        generatedFromFactAt = snapshot_end_at
      } else {
        // hybrid 模式：需要根据具体业务逻辑计算
        // 这里简化处理，使用时间窗口的小时数（这是"量"，不是"钱"）
        const hoursDiff = (endTime - startTime) / (1000 * 60 * 60)
        usageValue = Math.max(0, hoursDiff)
        generatedFromFactAt = snapshot_end_at
      }
    } catch (factsError: any) {
      console.error("[Usage Snapshot API] 查询 Facts 失败:", factsError)
      // 如果查询 Facts 失败，仍然创建快照，但 usage_value 为 0
      usageValue = 0
    }

    // 3. 生成 usage_snapshots 记录
    const { data: snapshot, error: createError } = await supabase
      .from("usage_snapshots")
      .insert({
        rental_contract_id,
        device_id,
        snapshot_start_at,
        snapshot_end_at,
        usage_metric: finalUsageMetric,
        usage_value: usageValue,
        fact_source: fact_source as 'order_facts' | 'device_facts' | 'manual_override',
        generated_from_fact_at: generatedFromFactAt,
        status: "draft", // 新建快照默认为草稿状态
      })
      .select("id")
      .single()

    if (createError) {
      console.error("[Usage Snapshot API] 创建快照失败:", createError)
      return NextResponse.json(
        {
          success: false,
          error: "创建快照失败",
          details: createError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      snapshot_id: snapshot.id,
      message: "Usage Snapshot 生成成功",
    })
  } catch (err: any) {
    console.error("[Usage Snapshot API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
