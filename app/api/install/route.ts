import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// POST: 提交设备安装信息
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

    const { device_id, model, address, installer, install_date } = body

    // 验证必要参数
    if (!device_id) {
      return NextResponse.json(
        { error: "缺少必要参数: device_id" },
        { status: 400 }
      )
    }

    if (!model) {
      return NextResponse.json(
        { error: "缺少必要参数: model" },
        { status: 400 }
      )
    }

    if (!address) {
      return NextResponse.json(
        { error: "缺少必要参数: address" },
        { status: 400 }
      )
    }

    if (!installer) {
      return NextResponse.json(
        { error: "缺少必要参数: installer" },
        { status: 400 }
      )
    }

    // 处理安装时间，如果没有提供则使用当前时间
    const installDate = install_date || new Date().toISOString()

    // 插入或更新设备信息
    const { data, error } = await supabase
      .from("devices")
      .upsert(
        {
          device_id: device_id,
          model: model,
          address: address,
          installer: installer,
          install_date: installDate,
          status: "online", // 安装后默认为在线状态
          is_locked: false, // 新安装的设备默认未锁定
        },
        {
          onConflict: "device_id",
        }
      )
      .select()
      .single()

    if (error) {
      console.error("保存设备安装信息失败:", error)
      return NextResponse.json(
        { error: "保存设备安装信息失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "设备安装信息已成功保存",
      data: {
        device_id: data.device_id,
        model: data.model,
        address: data.address,
        installer: data.installer,
        install_date: data.install_date,
        status: data.status,
      },
    })
  } catch (error) {
    console.error("处理设备安装信息错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    )
  }
}

// GET: 获取设备安装信息
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

    if (!deviceId) {
      return NextResponse.json(
        { error: "缺少必要参数: device_id" },
        { status: 400 }
      )
    }

    // 获取设备安装信息
    const { data, error } = await supabase
      .from("devices")
      .select("device_id, model, address, installer, install_date, status, is_locked, created_at")
      .eq("device_id", deviceId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "设备不存在" },
          { status: 404 }
        )
      }
      console.error("获取设备安装信息失败:", error)
      return NextResponse.json(
        { error: "获取设备安装信息失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        device_id: data.device_id,
        model: data.model,
        address: data.address,
        installer: data.installer,
        install_date: data.install_date,
        status: data.status,
        is_locked: data.is_locked,
        created_at: data.created_at,
      },
    })
  } catch (error) {
    console.error("获取设备安装信息错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    )
  }
}

