import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyWorkerPermission } from "@/lib/auth/worker-auth"

// POST: 处理燃料配送（支持固定油箱和流动钢瓶两种场景）
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
    console.log("[配送API] 权限验证通过，配送员:", worker.name)

    const {
      device_id,
      container_type, // 'fixed_tank' 或 'mobile_bottle'
      // 流动钢瓶场景参数
      bottle_id,
      production_date,
      production_batch,
      filling_date,
      filling_batch,
      // 固定油箱场景参数
      fuel_amount_liters,
      // 通用参数
      delivery_person,
      location_address,
      fuel_batch_id,
    } = body

    // 验证必要参数
    if (!device_id) {
      return NextResponse.json(
        { error: "缺少必要参数: device_id" },
        { status: 400 }
      )
    }

    if (!container_type || !["fixed_tank", "mobile_bottle"].includes(container_type)) {
      return NextResponse.json(
        { error: "缺少或无效参数: container_type (必须是 'fixed_tank' 或 'mobile_bottle')" },
        { status: 400 }
      )
    }

    if (!delivery_person) {
      return NextResponse.json(
        { error: "缺少必要参数: delivery_person" },
        { status: 400 }
      )
    }

    // 检查设备是否存在并获取设备信息
    const { data: deviceData, error: deviceError } = await supabase
      .from("devices")
      .select("device_id, is_locked, container_type, address")
      .eq("device_id", device_id)
      .single()

    if (deviceError || !deviceData) {
      return NextResponse.json(
        { error: "无效设备：设备ID不存在" },
        { status: 404 }
      )
    }

    // 验证container_type是否匹配
    if (deviceData.container_type && deviceData.container_type !== container_type) {
      return NextResponse.json(
        { error: `设备类型不匹配：设备为 ${deviceData.container_type}，但请求为 ${container_type}` },
        { status: 400 }
      )
    }

    // 获取当前设备的锁机状态
    const isLocked = deviceData.is_locked || false
    const deviceAddress = location_address || deviceData.address || "未知地址"

    let newFuelPercentage = 100
    let currentTankId: string | null = null
    let performanceType: "volume" | "count" = "count"
    let performanceValue: number = 1

    // 根据场景处理不同逻辑
    if (container_type === "mobile_bottle") {
      // 流动钢瓶场景：双码绑定
      if (!bottle_id) {
        return NextResponse.json(
          { error: "流动钢瓶场景缺少必要参数: bottle_id" },
          { status: 400 }
        )
      }

      currentTankId = bottle_id
      performanceType = "count"
      performanceValue = 1 // 换瓶次数

      // 创建或更新钢瓶信息
      const { error: bottleError } = await supabase
        .from("bottles")
        .upsert(
          [
            {
              bottle_id: bottle_id,
              production_date: production_date || null,
              production_batch: production_batch || null,
              filling_date: filling_date || new Date().toISOString().split("T")[0],
              filling_batch: filling_batch || null,
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
      // 固定油箱场景：加注升数
      if (!fuel_amount_liters || fuel_amount_liters <= 0) {
        return NextResponse.json(
          { error: "固定油箱场景缺少或无效参数: fuel_amount_liters (必须大于0)" },
          { status: 400 }
        )
      }

      // 获取当前燃料百分比
      const { data: currentFuelData } = await supabase
        .from("fuel_level")
        .select("percentage")
        .eq("device_id", device_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      const currentPercentage = currentFuelData?.percentage || 0
      // 假设油箱容量为1000升（可根据实际情况调整）
      const tankCapacity = 1000
      const currentLiters = (currentPercentage / 100) * tankCapacity
      const newLiters = currentLiters + fuel_amount_liters
      newFuelPercentage = Math.min(100, (newLiters / tankCapacity) * 100)

      performanceType = "volume"
      performanceValue = fuel_amount_liters
    }

    // 1. 更新 fuel_level 表
    const { data: fuelData, error: fuelError } = await supabase
      .from("fuel_level")
      .insert([
        {
          device_id: device_id,
          percentage: newFuelPercentage,
          current_tank_id: currentTankId,
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

    // 2. 记录配送日志（包含所有必要信息）
    const { data: logData, error: logError } = await supabase
      .from("delivery_logs")
      .insert([
        {
          device_id: device_id,
          tank_id: currentTankId || bottle_id || null,
          container_type: container_type,
          fuel_amount_liters: container_type === "fixed_tank" ? fuel_amount_liters : null,
          fuel_batch_id: fuel_batch_id || null,
          location_address: deviceAddress,
          delivery_person: delivery_person,
          performance_type: performanceType,
          performance_value: performanceValue,
          executed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (logError) {
      console.error("记录配送日志失败:", logError)
      // 即使日志记录失败，也不影响主要功能，只记录错误
    }

    return NextResponse.json({
      success: true,
      message: "燃料配送记录已成功保存",
      data: {
        device_id: device_id,
        container_type: container_type,
        fuel_percentage: newFuelPercentage,
        performance_type: performanceType,
        performance_value: performanceValue,
        delivery_person: delivery_person,
        executed_at: new Date().toISOString(),
        log_id: logData?.id || null,
      },
    })
  } catch (error) {
    console.error("处理燃料配送错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    )
  }
}

// GET: 查询配送记录
export async function GET(request: Request) {
  try {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase环境变量未配置" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("device_id")
    const deliveryPerson = searchParams.get("delivery_person")

    // 构建查询
    let query = supabase
      .from("delivery_logs")
      .select("id, device_id, tank_id, delivery_person, executed_at, created_at")
      .order("executed_at", { ascending: false })

    if (deviceId) {
      query = query.eq("device_id", deviceId)
    }

    if (deliveryPerson) {
      query = query.eq("delivery_person", deliveryPerson)
    }

    const { data, error } = await query.limit(100)

    if (error) {
      console.error("获取配送记录失败:", error)
      return NextResponse.json(
        { error: "获取配送记录失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error("获取配送记录错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    )
  }
}

