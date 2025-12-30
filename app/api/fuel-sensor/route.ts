import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// POST: 接收传感器数据并更新 fuel_level 表
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

    const { percentage } = body

    // 验证必要参数
    if (percentage === undefined || percentage === null) {
      return NextResponse.json(
        { error: "缺少必要参数: percentage" },
        { status: 400 }
      )
    }

    // 验证 percentage 类型和范围
    const percentageNum = Number(percentage)
    if (isNaN(percentageNum)) {
      return NextResponse.json(
        { error: "percentage 必须是数字" },
        { status: 400 }
      )
    }

    if (percentageNum < 0 || percentageNum > 100) {
      return NextResponse.json(
        { error: "percentage 必须在 0-100 之间" },
        { status: 400 }
      )
    }

    // 获取当前锁机状态（从 devices 表或最新的 fuel_level 记录）
    const { data: deviceData } = await supabase
      .from("devices")
      .select("is_locked")
      .eq("device_id", device_id)
      .single()

    const isLocked = deviceData?.is_locked || false

    // 插入新记录到 fuel_level 表，关联到设备
    const { data, error } = await supabase
      .from("fuel_level")
      .insert([
        {
          device_id: device_id,
          percentage: percentageNum,
          is_locked: isLocked,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("保存燃料传感器数据失败:", error)
      return NextResponse.json(
        { error: "保存数据失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "燃料传感器数据已成功保存",
      data: {
        id: data.id,
        percentage: data.percentage,
        is_locked: data.is_locked,
        created_at: data.created_at,
      },
    })
  } catch (error) {
    console.error("处理燃料传感器数据错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    )
  }
}

// GET: 可选，用于测试或查询最新数据
export async function GET(request: Request) {
  try {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase环境变量未配置" },
        { status: 500 }
      )
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("device_id")

    // 构建查询
    let query = supabase
      .from("fuel_level")
      .select("id, device_id, percentage, is_locked, created_at")
      .order("created_at", { ascending: false })

    // 如果提供了 device_id，则过滤
    if (deviceId) {
      query = query.eq("device_id", deviceId)
    }

    const { data, error } = await query.limit(1).single()

    if (error && error.code !== "PGRST116") {
      console.error("获取燃料传感器数据失败:", error)
      return NextResponse.json(
        { error: "获取数据失败", details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({
        message: "暂无数据",
        data: null,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        percentage: data.percentage,
        created_at: data.created_at,
      },
    })
  } catch (error) {
    console.error("获取燃料传感器数据错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    )
  }
}

