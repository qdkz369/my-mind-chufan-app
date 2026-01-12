// ACCESS_LEVEL: STAFF_LEVEL
// ALLOWED_ROLES: staff
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：只能 staff 调用，必须绑定 worker_id / assigned_to，后续必须使用 RLS 限制只能访问自己数据

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyWorkerPermission } from "@/lib/auth/worker-auth"

// POST: 记录配送操作到 filling_logs
// 需要配送员权限
export async function POST(request: Request) {
  try {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase环境变量未配置" },
        { status: 500 }
      )
    }

    // 解析请求体
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: "请求体格式错误，需要JSON格式" },
        { status: 400 }
      )
    }
    
    // 验证配送员权限
    const authResult = await verifyWorkerPermission(request, "delivery", body)
    if (authResult instanceof NextResponse) {
      return authResult // 返回错误响应
    }
    const worker = authResult.worker
    console.log("[配送记录API] 权限验证通过，配送员:", worker.name)

    const {
      restaurant_id,
      device_id,
      delivery_person,
      container_type,
      fuel_amount_liters, // 固定油箱场景
      cylinder_id, // 钢瓶场景
      location_address,
      fuel_batch_id,
    } = body

    // 验证必要参数
    if (!restaurant_id) {
      return NextResponse.json(
        { error: "缺少必要参数: restaurant_id" },
        { status: 400 }
      )
    }

    if (!device_id) {
      return NextResponse.json(
        { error: "缺少必要参数: device_id" },
        { status: 400 }
      )
    }

    if (!delivery_person) {
      return NextResponse.json(
        { error: "缺少必要参数: delivery_person" },
        { status: 400 }
      )
    }

    if (!container_type || !["fixed_tank", "cylinder"].includes(container_type)) {
      return NextResponse.json(
        { error: "缺少或无效参数: container_type (必须是 'fixed_tank' 或 'cylinder')" },
        { status: 400 }
      )
    }

    // 根据场景验证特定字段
    if (container_type === "fixed_tank") {
      if (!fuel_amount_liters || fuel_amount_liters <= 0) {
        return NextResponse.json(
          { error: "固定油箱场景缺少或无效参数: fuel_amount_liters (必须大于0)" },
          { status: 400 }
        )
      }
    } else {
      if (!cylinder_id) {
        return NextResponse.json(
          { error: "钢瓶场景缺少必要参数: cylinder_id" },
          { status: 400 }
        )
      }
    }

    // 检查设备是否存在
    const { data: deviceData, error: deviceError } = await supabase
      .from("devices")
      .select("device_id, restaurant_id, container_type, is_locked")
      .eq("device_id", device_id)
      .single()

    if (deviceError || !deviceData) {
      return NextResponse.json(
        { error: "无效设备：设备ID不存在" },
        { status: 404 }
      )
    }

    // 验证设备是否属于该餐厅
    if (deviceData.restaurant_id !== restaurant_id) {
      return NextResponse.json(
        { error: "设备不属于该餐厅" },
        { status: 403 }
      )
    }

    // 验证容器类型是否匹配
    if (deviceData.container_type !== container_type) {
      return NextResponse.json(
        { error: `设备类型不匹配：设备为 ${deviceData.container_type}，但请求为 ${container_type}` },
        { status: 400 }
      )
    }

    const isLocked = deviceData.is_locked || false

    let newFuelPercentage = 100
    let currentCylinderId: string | null = null
    let refilledAmount = 0 // 本次加注量（用于累加到餐厅总量）

    // 根据场景处理不同逻辑
    if (container_type === "cylinder") {
      // 钢瓶场景：更新 last_cylinder_id，设置燃料为100%
      currentCylinderId = cylinder_id
      // 假设标准钢瓶容量为50升（可根据实际情况调整）
      refilledAmount = 50

      // 更新设备的 last_cylinder_id
      const { error: updateError } = await supabase
        .from("devices")
        .update({ last_cylinder_id: cylinder_id, updated_at: new Date().toISOString() })
        .eq("device_id", device_id)

      if (updateError) {
        console.error("更新设备钢瓶ID失败:", updateError)
        // 不阻止流程，只记录错误
      }

      // 创建或更新钢瓶信息（如果 bottles 表存在）
      const { error: bottleError } = await supabase
        .from("bottles")
        .upsert(
          [
            {
              bottle_id: cylinder_id,
              status: "in_use",
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "bottle_id" }
        )

      if (bottleError) {
        console.error("保存钢瓶信息失败:", bottleError)
        // 不阻止流程，只记录错误
      }
    } else {
      // 固定油箱场景：根据用户要求，加注后更新为100%
      // 注意：如果业务逻辑需要累加，可以改为累加逻辑
      newFuelPercentage = 100
      refilledAmount = fuel_amount_liters
    }

    // 1. 更新 fuel_level 表
    const { data: fuelData, error: fuelError } = await supabase
      .from("fuel_level")
      .insert([
        {
          device_id: device_id,
          percentage: newFuelPercentage,
          current_tank_id: currentCylinderId || null,
          is_locked: isLocked,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (fuelError) {
      console.error("更新燃料数据失败:", fuelError)
      return NextResponse.json(
        { error: "更新燃料数据失败", details: fuelError.message },
        { status: 500 }
      )
    }

    // 2. 记录到 filling_logs 表
    // 注意：operation_type 根据 container_type 自动推断
    const operationType = container_type === "fixed_tank" ? "refill" : "cylinder_change"
    
    const { data: logData, error: logError } = await supabase
      .from("filling_logs")
      .insert([
        {
          restaurant_id: restaurant_id, // UUID 类型
          device_id: device_id,
          delivery_person: delivery_person,
          operation_type: operationType,
          fuel_amount_liters: container_type === "fixed_tank" ? fuel_amount_liters : null,
          cylinder_id: container_type === "cylinder" ? cylinder_id : null,
          location_address: location_address || null,
          fuel_batch_id: fuel_batch_id || null,
          executed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (logError) {
      console.error("记录配送日志失败:", logError)
      return NextResponse.json(
        { error: "记录配送日志失败", details: logError.message },
        { status: 500 }
      )
    }

    // 3. 累加总量：更新餐厅的 total_refilled 统计
    // 注意：新结构使用 id (UUID) 作为主键
    const { data: restaurantData, error: restaurantFetchError } = await supabase
      .from("restaurants")
      .select("total_refilled")
      .eq("id", restaurant_id)
      .single()

    if (!restaurantFetchError && restaurantData) {
      const currentTotal = Number(restaurantData.total_refilled) || 0
      const newTotal = currentTotal + refilledAmount

      const { error: restaurantUpdateError } = await supabase
        .from("restaurants")
        .update({ total_refilled: newTotal, updated_at: new Date().toISOString() })
        .eq("id", restaurant_id)

      if (restaurantUpdateError) {
        console.error("更新餐厅总量统计失败:", restaurantUpdateError)
        // 不阻止流程，只记录错误
      }
    }

    // 4. 状态流转：检查并更新进行中的订单状态
    // 查询该餐厅的进行中订单（状态为 "delivering"、"配送中"、"进行中"）
    // 注意：如果 orders 表没有 restaurant_id 字段，此查询可能失败，但不影响主流程
    let ordersUpdated = 0
    try {
      const { data: ongoingOrders, error: ordersFetchError } = await supabase
        .from("delivery_orders")
        .select("id, status")
        .eq("restaurant_id", restaurant_id)
        .in("status", ["delivering", "配送中", "进行中"])

      if (!ordersFetchError && ongoingOrders && ongoingOrders.length > 0) {
        // 更新所有进行中的订单状态为"已完成"
        const orderIds = ongoingOrders.map((order) => order.id)
        const { error: ordersUpdateError } = await supabase
          .from("delivery_orders")
          .update({ 
            status: "completed",
            updated_at: new Date().toISOString() 
          })
          .in("id", orderIds)

        if (ordersUpdateError) {
          console.error("更新订单状态失败:", ordersUpdateError)
          // 不阻止流程，只记录错误
        } else {
          ordersUpdated = ongoingOrders.length
          console.log(`已自动将 ${ongoingOrders.length} 个订单标记为已完成`)
        }
      }
    } catch (ordersError) {
      // 如果 orders 表不存在或没有 restaurant_id 字段，忽略错误
      console.warn("订单状态更新跳过（可能 orders 表未配置 restaurant_id 字段）:", ordersError)
    }

    return NextResponse.json({
      success: true,
      message: "配送记录已成功保存",
      data: {
        log_id: logData.id,
        device_id: device_id,
        container_type: container_type,
        fuel_percentage: newFuelPercentage,
        delivery_person: delivery_person,
        executed_at: new Date().toISOString(),
        refilled_amount: refilledAmount,
        orders_updated: ordersUpdated,
      },
    })
  } catch (error) {
    console.error("处理配送记录错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    )
  }
}

