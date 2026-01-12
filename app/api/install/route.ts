// ACCESS_LEVEL: STAFF_LEVEL
// ALLOWED_ROLES: staff
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：只能 staff 调用，必须绑定 worker_id / assigned_to，后续必须使用 RLS 限制只能访问自己数据

import { NextResponse } from "next/server"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { verifyWorkerPermission } from "@/lib/auth/worker-auth"

// POST: 提交设备安装信息
// 需要安装工权限
export async function POST(request: Request) {
  try {
    // 检查 Supabase 是否已配置（使用 isSupabaseConfigured 而不是直接检查环境变量）
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json(
        { error: "Supabase未正确配置，请检查环境变量或联系管理员" },
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
    
    // 验证安装工权限
    const authResult = await verifyWorkerPermission(request, "install", body)
    if (authResult instanceof NextResponse) {
      return authResult // 返回错误响应
    }
    const worker = authResult.worker
    console.log("[安装API] 权限验证通过，安装工:", worker.name)

    const { device_id, model, address, installer, install_date, install_proof_image } = body

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

    console.log(`[安装API] 开始安装设备: ${device_id}`)
    console.log(`[安装API] 安装数据:`, {
      device_id,
      model,
      address,
      installer,
      install_date: installDate,
    })

    // 先检查设备是否存在
    const { data: existingDevice, error: checkError } = await supabase
      .from("devices")
      .select("device_id")
      .eq("device_id", device_id)
      .maybeSingle()

    if (checkError) {
      console.error(`[安装API] 检查设备失败:`, checkError)
      return NextResponse.json(
        { 
          error: "检查设备失败", 
          details: checkError.message,
          code: checkError.code,
        },
        { status: 500 }
      )
    }

    let deviceData

    if (existingDevice) {
      // 设备存在，更新
      console.log(`[安装API] 设备已存在，更新设备: ${device_id}`)
      const { data: updatedData, error: updateError } = await supabase
        .from("devices")
        .update({
          model: model,
          address: address,
          installer: installer,
          install_date: installDate,
          install_proof_image: install_proof_image || null, // 安装凭证图片URL
          status: "online",
          is_locked: false,
          updated_at: new Date().toISOString(),
        })
        .eq("device_id", device_id)
        .select()
        .single()

      if (updateError) {
        console.error(`[安装API] 更新设备失败:`, updateError)
        console.error(`[安装API] 错误详情:`, {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        })
        return NextResponse.json(
          { 
            error: "更新设备安装信息失败", 
            details: updateError.message,
            code: updateError.code,
            hint: updateError.hint,
          },
          { status: 500 }
        )
      }

      console.log(`[安装API] 设备更新成功: ${device_id}`, updatedData)
      deviceData = updatedData
    } else {
      // 设备不存在，创建
      console.log(`[安装API] 设备不存在，创建新设备: ${device_id}`)
      const { data: newDeviceData, error: insertError } = await supabase
        .from("devices")
        .insert({
          device_id: device_id,
          model: model,
          address: address,
          installer: installer,
          install_date: installDate,
          install_proof_image: install_proof_image || null, // 安装凭证图片URL
          status: "online",
          is_locked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        console.error(`[安装API] 创建设备失败:`, insertError)
        console.error(`[安装API] 错误详情:`, {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        })
        return NextResponse.json(
          { 
            error: "保存设备安装信息失败", 
            details: insertError.message,
            code: insertError.code,
            hint: insertError.hint,
          },
          { status: 500 }
        )
      }

      console.log(`[安装API] 设备创建成功: ${device_id}`, newDeviceData)
      deviceData = newDeviceData
    }

    return NextResponse.json({
      success: true,
      message: "设备安装信息已成功保存",
      data: {
        device_id: deviceData.device_id,
        model: deviceData.model,
        address: deviceData.address,
        installer: deviceData.installer,
        install_date: deviceData.install_date,
        install_proof_image: deviceData.install_proof_image || null,
        status: deviceData.status,
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
    // 检查 Supabase 是否已配置
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json(
        { error: "Supabase未正确配置，请检查环境变量或联系管理员" },
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

