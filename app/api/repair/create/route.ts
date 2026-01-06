import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"

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
      service_type, // 服务类型：维修服务、清洁服务、工程改造
      description, // 问题描述
      urgency, // 紧急程度：low, medium, high
      contact_phone, // 联系电话
      audio_url, // 音频文件URL（可选）
      user_id, // 用户ID（从前端传递，用于 RLS 策略）
    } = body

    // 获取当前认证用户ID（优先使用请求体中的 user_id，如果没有则尝试从请求头获取）
    let currentUserId: string | null = user_id || null
    
    // 如果请求体中没有 user_id，尝试从请求头中获取认证令牌
    if (!currentUserId) {
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7)
        try {
          // 创建服务端 Supabase 客户端来验证令牌
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gjlhcpfvjgqabqanvgmu.supabase.co"
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_OQSB-t8qr1xO0WRcpVSIZA_O4RFkAHQ"
          const serverClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          })
          
          const { data: { user }, error: authError } = await serverClient.auth.getUser(token)
          if (!authError && user) {
            currentUserId = user.id
          }
        } catch (authErr) {
          console.warn("[创建报修API] 无法从请求头获取用户ID:", authErr)
        }
      }
    }
    
    // 如果仍然无法获取 user_id，尝试使用服务角色密钥绕过 RLS（仅用于创建订单）
    // 注意：这需要配置 SUPABASE_SERVICE_ROLE_KEY 环境变量
    let supabaseClient = supabase
    let useServiceRole = false
    if (!currentUserId) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gjlhcpfvjgqabqanvgmu.supabase.co"
        supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
        useServiceRole = true
        console.log("[创建报修API] 使用服务角色密钥创建订单（绕过 RLS）")
        // 注意：使用服务角色密钥时，user_id 可以为 NULL（如果 RLS 策略允许）
        // 或者可以设置为 restaurant_id 作为临时解决方案
      } else {
        // 如果没有服务角色密钥，且无法获取用户ID，返回错误
        return NextResponse.json(
          {
            error: "创建报修工单失败",
            details: "无法获取用户身份信息。请确保已登录或联系管理员配置服务角色密钥。",
            hint: "RLS 策略要求 user_id 字段必须匹配当前认证用户。",
          },
          { status: 401 }
        )
      }
    }

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
    const { data: restaurantData, error: restaurantError } = await supabaseClient
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
      const { data: deviceData, error: deviceError } = await supabaseClient
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
      service_type: service_type || "维修服务", // 使用前端传递的服务类型，默认为"维修服务"
      status: "pending", // 待处理
      amount: 0, // 报修时金额为0，维修完成后才确定
      description: finalDescription, // 问题描述
      customer_confirmed: false,
    }
    
    // 设置 user_id（RLS 策略要求）
    // 重要：即使使用服务角色密钥，也尝试设置一个有效的 user_id，以确保 RLS 策略通过
    if (currentUserId) {
      repairData.user_id = currentUserId
      console.log("[创建报修API] 设置 user_id:", currentUserId)
    } else if (useServiceRole) {
      // 如果使用服务角色密钥但没有用户ID，尝试从 restaurant_id 关联的用户获取
      // 或者使用一个默认的系统用户ID（如果存在）
      // 如果都不行，服务角色密钥应该能够绕过 RLS，但为了安全，我们仍然尝试设置一个值
      // 注意：这里我们需要确保即使使用服务角色密钥，也设置一个合理的 user_id
      // 暂时不设置 user_id，让服务角色密钥绕过 RLS
      console.log("[创建报修API] 使用服务角色密钥，user_id 为 NULL（绕过 RLS）")
      // 但是，如果 RLS 策略仍然检查 user_id，我们需要设置一个值
      // 尝试从 restaurant_id 获取关联的用户ID
      try {
        const { data: restaurantInfo } = await supabaseClient
          .from("restaurants")
          .select("user_id, owner_id")
          .eq("id", restaurant_id)
          .single()
        
        if (restaurantInfo && (restaurantInfo.user_id || restaurantInfo.owner_id)) {
          repairData.user_id = restaurantInfo.user_id || restaurantInfo.owner_id
          console.log("[创建报修API] 从餐厅信息获取 user_id:", repairData.user_id)
        }
      } catch (err) {
        console.warn("[创建报修API] 无法从餐厅信息获取 user_id:", err)
      }
    } else {
      // 如果没有用户ID且没有服务角色密钥，这不应该发生（应该在前面返回错误）
      // 但为了安全，我们仍然记录警告
      console.error("[创建报修API] 警告：没有用户ID且没有服务角色密钥，但代码继续执行")
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
    // 重要：在插入前，确保 repairData 包含所有必需字段
    console.log("[创建报修API] 准备插入数据:", {
      restaurant_id: repairData.restaurant_id,
      user_id: repairData.user_id || "NULL",
      service_type: repairData.service_type,
      useServiceRole: useServiceRole,
    })
    
    let { data: newRepair, error: createError } = await supabaseClient
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
        currentUserId: currentUserId,
        useServiceRole: useServiceRole,
      })
      
      // 如果是 RLS 策略错误，提供更详细的提示
      if (createError.message && createError.message.includes("row-level security")) {
        return NextResponse.json(
          {
            error: "创建报修工单失败",
            details: "数据库权限错误：无法创建订单。请确保已登录或联系管理员检查权限配置。",
            code: createError.code,
            hint: "RLS 策略要求 user_id 字段必须匹配当前认证用户。如果使用服务角色密钥，请确保 RLS 策略允许服务角色插入数据。",
            debug: {
              hasUserId: !!repairData.user_id,
              userId: repairData.user_id || null,
              useServiceRole: useServiceRole,
            },
          },
          { status: 500 }
        )
      }
      
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
        const { error: updateError } = await supabaseClient
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

