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
    const hasDescription = description && typeof description === 'string' && description.trim() !== ""
    const hasAudio = audio_url && typeof audio_url === 'string' && audio_url.trim() !== ""
    
    if (!hasDescription && !hasAudio) {
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

    // 确定最终的描述文本
    // 如果有文字描述，使用文字描述；如果只有语音，使用"[语音消息]"
    const finalDescription = hasDescription 
      ? (typeof description === 'string' ? description.trim() : "") 
      : (hasAudio ? "[语音消息]" : "")

    // 构建基础报修数据（只包含肯定存在的字段）
    const repairData: any = {
      restaurant_id: restaurant_id,
      service_type: "维修服务", // 统一使用"维修服务"作为service_type
      status: "pending", // 待处理
      amount: 0, // 报修时金额为0，维修完成后才确定
      description: finalDescription, // 问题描述
      customer_confirmed: false,
    }

    // 如果有设备ID，在描述中包含设备信息（因为device_id字段可能不存在）
    if (device_id) {
      if (finalDescription) {
        repairData.description = `[设备: ${device_id}] ${finalDescription}`
      } else {
        repairData.description = `[设备: ${device_id}]`
      }
    }

    // 尝试插入基础数据（不包含可能不存在的字段）
    let { data: newRepair, error: createError } = await supabase
      .from("orders")
      .insert(repairData)
      .select("id, restaurant_id, service_type, status, description, created_at, updated_at, amount")
      .single()

    // 如果基础插入失败，记录详细错误
    if (createError) {
      console.error("[创建报修API] 创建报修工单失败:", {
        error: createError,
        message: createError.message,
        code: createError.code,
        details: createError.details,
        hint: createError.hint,
        repairData: repairData,
      })
      
      return NextResponse.json(
        {
          error: "创建报修工单失败",
          details: createError.message || "未知错误",
          code: createError.code,
          hint: createError.hint,
        },
        { status: 500 }
      )
    }

    // 如果基础插入成功，尝试更新可选字段（audio_url, urgency等）
    // 这些字段可能不存在，所以使用update而不是在insert中包含
    if (newRepair && newRepair.id) {
      const updateData: any = {}
      
      // 尝试更新音频URL（如果字段存在）
      if (hasAudio) {
        updateData.audio_url = audio_url
      }
      
      // 尝试更新紧急程度（如果字段存在）
      if (urgency) {
        updateData.urgency = urgency
      }
      
      // 尝试更新设备ID（如果字段存在）
      if (device_id) {
        updateData.device_id = device_id
      }
      
      // 如果有需要更新的字段，尝试更新
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", newRepair.id)
        
        // 更新失败不影响主流程，只记录警告
        if (updateError) {
          console.warn("[创建报修API] 更新可选字段失败（不影响主流程）:", {
            error: updateError,
            updateData: updateData,
          })
        }
      }
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

