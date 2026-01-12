// ACCESS_LEVEL: PUBLIC (公开API)
// ALLOWED_ROLES: 无（公开访问，由传感器设备调用）
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：公开API，用于接收传感器数据，无需权限验证（但需要验证设备身份）

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// POST: 接收传感器数据并更新 fuel_level 表
export async function POST(request: Request) {
  try {
    // 检查 Supabase 客户端
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

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

    const { percentage, device_id } = body

    // 验证必要参数
    if (percentage === undefined || percentage === null) {
      return NextResponse.json(
        { error: "缺少必要参数: percentage" },
        { status: 400 }
      )
    }

    if (!device_id) {
      return NextResponse.json(
        { error: "缺少必要参数: device_id" },
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
    const { data: deviceData, error: deviceError } = await supabase
      .from("devices")
      .select("is_locked")
      .eq("device_id", device_id)
      .maybeSingle()

    // 如果查询设备失败，使用默认值
    const isLocked = deviceData?.is_locked || false
    if (deviceError && deviceError.code !== "PGRST116") {
      console.warn("[燃料传感器API] 查询设备状态失败，使用默认值:", deviceError)
    }

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
      console.error("[燃料传感器API] 保存数据失败:", error)
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
    console.error("[燃料传感器API] 处理请求错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    )
  }
}

// GET: 查询最新燃料数据（前端调用）
export async function GET(request: Request) {
  try {
    // 检查 Supabase 客户端
    if (!supabase) {
      console.warn("[燃料传感器API] Supabase 客户端未初始化，返回默认值")
      return NextResponse.json({
        success: true,
        data: {
          percentage: 0,
          created_at: new Date().toISOString(),
        },
      })
    }

    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn("[燃料传感器API] Supabase 环境变量未配置，返回默认值")
      return NextResponse.json({
        success: true,
        data: {
          percentage: 0,
          created_at: new Date().toISOString(),
        },
      })
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("device_id")

    // 如果没有提供 device_id，返回默认值
    if (!deviceId) {
      console.warn("[燃料传感器API] 未提供 device_id 参数，返回默认值")
      return NextResponse.json({
        success: true,
        data: {
          percentage: 0,
          created_at: new Date().toISOString(),
        },
      })
    }

    // 构建查询
    const { data, error } = await supabase
      .from("fuel_level")
      .select("id, device_id, percentage, is_locked, created_at")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    // 如果查询出错（非"未找到"错误），记录日志并返回默认值
    if (error && error.code !== "PGRST116") {
      console.error("[燃料传感器API] 查询数据失败:", error)
      // 不返回 500，而是返回默认值，避免前端崩溃
      return NextResponse.json({
        success: true,
        data: {
          percentage: 0,
          created_at: new Date().toISOString(),
        },
        warning: "查询失败，返回默认值",
      })
    }

    // 如果找不到数据，返回默认值 0
    if (!data) {
      console.log("[燃料传感器API] 未找到燃料数据，返回默认值 0")
      return NextResponse.json({
        success: true,
        data: {
          percentage: 0,
          created_at: new Date().toISOString(),
        },
      })
    }

    // 成功返回数据
    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        percentage: data.percentage,
        created_at: data.created_at,
      },
    })
  } catch (error) {
    console.error("[燃料传感器API] 处理请求错误:", error)
    // 即使捕获到错误，也返回默认值而不是 500，确保前端不会崩溃
    return NextResponse.json({
      success: true,
      data: {
        percentage: 0,
        created_at: new Date().toISOString(),
      },
      warning: "服务器错误，返回默认值",
    })
  }
}

