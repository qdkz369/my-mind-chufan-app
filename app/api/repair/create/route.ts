import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// POST: 创建报修工单
export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      restaurant_id,
      device_id, // 可选：设备ID
      description, // 问题描述
      urgency, // 紧急程度：low, medium, high
      contact_phone, // 联系电话
      audio_url, // 音频文件URL（可选）
    } = body

    // 验证必要参数
    if (!restaurant_id) {
      return NextResponse.json(
        { error: "缺少必要参数: restaurant_id" },
        { status: 400 }
      )
    }

    // 至少需要文字描述或音频URL
    if ((!description || description.trim() === "") && !audio_url) {
      return NextResponse.json(
        { error: "请填写问题描述或录制语音" },
        { status: 400 }
      )
    }

    // 验证餐厅是否存在
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, contact_phone")
      .eq("id", restaurant_id)
      .single()

    if (restaurantError || !restaurantData) {
      return NextResponse.json(
        { error: "餐厅不存在" },
        { status: 404 }
      )
    }

    // 如果提供了设备ID，验证设备是否存在且属于该餐厅
    if (device_id) {
      const { data: deviceData, error: deviceError } = await supabase
        .from("devices")
        .select("device_id, restaurant_id, status")
        .eq("device_id", device_id)
        .eq("restaurant_id", restaurant_id)
        .single()

      if (deviceError || !deviceData) {
        return NextResponse.json(
          { error: "设备不存在或不属于该餐厅" },
          { status: 404 }
        )
      }
    }

    // 生成报修单号
    const repairNumber = `REP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // 创建报修工单（使用orders表，service_type为"维修服务"）
    // 将报修信息整合到service_type中，格式：维修服务 - [设备ID] - [紧急程度] - 问题描述
    let serviceTypeDescription = "维修服务"
    if (device_id) {
      serviceTypeDescription += ` - 设备:${device_id}`
    }
    if (urgency) {
      const urgencyMap: Record<string, string> = {
        low: "低",
        medium: "中",
        high: "高"
      }
      serviceTypeDescription += ` - 紧急:${urgencyMap[urgency] || "中"}`
    }
    serviceTypeDescription += ` - ${description.trim()}`

    const repairData: any = {
      restaurant_id: restaurant_id,
      service_type: "维修服务", // 统一使用"维修服务"作为service_type
      status: "pending", // 待处理
      amount: 0, // 报修时金额为0，维修完成后才确定
      description: description?.trim() || (audio_url ? "[语音消息]" : ""), // 问题描述
      customer_confirmed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 如果有音频URL，存储到audio_url字段（如果orders表有该字段）
    if (audio_url) {
      repairData.audio_url = audio_url
    }

    // 如果有设备ID，存储到备注或其他字段（如果orders表有device_id字段则使用，否则存储到description）
    if (device_id) {
      repairData.description = `[设备: ${device_id}] ${description.trim()}`
    }

    // 存储紧急程度（如果orders表有urgency字段则使用，否则存储到备注）
    if (urgency) {
      // 假设orders表可能有urgency字段，如果没有则忽略
      repairData.urgency = urgency
    }

    // 插入到orders表
    const { data: newRepair, error: createError } = await supabase
      .from("orders")
      .insert(repairData)
      .select("id, restaurant_id, service_type, status, description, created_at, updated_at, amount")
      .single()

    if (createError) {
      console.error("[创建报修API] 创建报修工单失败:", createError)
      return NextResponse.json(
        {
          error: "创建报修工单失败",
          details: createError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "报修工单创建成功",
      data: {
        ...newRepair,
        repair_number: repairNumber,
      },
    })
  } catch (error) {
    console.error("[创建报修API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

