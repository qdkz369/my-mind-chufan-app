import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// POST: 注册新餐厅
export async function POST(request: Request) {
  try {
    // 添加调试日志
    console.log('[注册API] Supabase客户端状态:', supabase ? '已初始化' : '未初始化')
    console.log('[注册API] 环境变量URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '未配置（使用后备值）')
    console.log('[注册API] 环境变量Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已配置（已隐藏）' : '未配置（使用后备值）')
    
    // 移除弹窗拦截：直接尝试连接，不检查环境变量
    if (!supabase) {
      console.error('[注册API] Supabase客户端未初始化，详细错误信息:')
      console.error('[注册API] - 客户端对象:', supabase)
      console.error('[注册API] - 环境变量URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.error('[注册API] - 环境变量Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已配置（已隐藏）' : '未配置')
      console.error('[注册API] - 请检查 lib/supabase.ts 中的后备值配置')
      
      return NextResponse.json(
        { 
          error: "数据库连接失败，请检查控制台获取详细错误信息",
          details: "Supabase客户端未初始化，请查看服务器控制台日志"
        },
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

    const {
      name, // 姓名
      phone, // 手机号
      restaurant_name, // 餐厅名称
      latitude, // GPS纬度
      longitude, // GPS经度
      address, // 地址（可选，从GPS反向地理编码获取）
    } = body

    // 验证必要参数
    if (!name || !phone || !restaurant_name) {
      return NextResponse.json(
        { error: "缺少必要参数: name, phone, restaurant_name" },
        { status: 400 }
      )
    }

    // 地理位置为可选字段，如果未提供则使用 null
    const hasLocation = latitude !== undefined && latitude !== null && 
                       longitude !== undefined && longitude !== null &&
                       latitude !== 0 && longitude !== 0

    // 生成随机 Token（32位十六进制字符串）
    const generateRandomToken = (): string => {
      const chars = '0123456789abcdef'
      let token = ''
      for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return token
    }

    // 检查 token 是否已存在，如果存在则重新生成
    let newToken: string = ""
    let tokenExists = true
    let attempts = 0
    const maxAttempts = 10

    while (tokenExists && attempts < maxAttempts) {
      newToken = generateRandomToken()
      
      // 检查 token 是否已存在
      const { data: existingRestaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("qr_token", newToken)
        .single()

      if (!existingRestaurant) {
        tokenExists = false
      }
      attempts++
    }

    if (tokenExists || !newToken) {
      return NextResponse.json(
        { error: "生成唯一Token失败，请重试" },
        { status: 500 }
      )
    }

    // 创建新餐厅记录
    // location字段存储格式化的坐标字符串 "latitude,longitude"（如果提供了坐标）
    // 彻底解耦定位：如果 location 为空，直接传入 null，不触发任何错误
    const location = hasLocation ? `${latitude},${longitude}` : null
    
    // 构建插入数据对象，确保 null 值正确处理
    const insertData: any = {
      name: restaurant_name,
      qr_token: newToken,
      total_refilled: 0,
      status: "unactivated", // 新注册的餐厅状态为未激活
      contact_name: name,
      contact_phone: phone,
    }
    
    // 只有在有地址时才设置 address，否则使用默认值
    if (address && address.trim() !== "") {
      insertData.address = address
    } else if (hasLocation && location) {
      insertData.address = location
    } else {
      insertData.address = "地址待完善"
    }
    
    // 只有在有定位信息时才设置 location 和坐标字段
    if (hasLocation && location) {
      insertData.location = location
      insertData.latitude = latitude
      insertData.longitude = longitude
    } else {
      // 彻底解耦：直接传入 null，不会触发数据库约束错误
      insertData.location = null
      insertData.latitude = null
      insertData.longitude = null
    }
    
    const { data: newRestaurant, error: createError } = await supabase
      .from("restaurants")
      .insert(insertData)
      .select("id, name, qr_token, status")
      .single()

    if (createError) {
      console.error("[注册API] 创建餐厅记录失败，详细错误信息:")
      console.error("[注册API] - 错误代码:", createError.code)
      console.error("[注册API] - 错误消息:", createError.message)
      console.error("[注册API] - 错误详情:", createError.details)
      console.error("[注册API] - 错误提示:", createError.hint)
      console.error("[注册API] - 插入数据:", JSON.stringify(insertData, null, 2))
      
      return NextResponse.json(
        { 
          error: "创建餐厅记录失败，请检查控制台获取详细错误信息",
          details: createError.message,
          code: createError.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "餐厅注册成功",
      data: {
        restaurant_id: newRestaurant.id,
        qr_token: newRestaurant.qr_token,
        name: newRestaurant.name,
        status: newRestaurant.status,
      },
    })
  } catch (error) {
    console.error("注册餐厅错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    )
  }
}

// PUT: 更新餐厅信息
export async function PUT(request: Request) {
  try {
    // 添加调试日志
    console.log('[更新API] Supabase客户端状态:', supabase ? '已初始化' : '未初始化')
    console.log('[更新API] 环境变量URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '未配置（使用后备值）')
    console.log('[更新API] 环境变量Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已配置（已隐藏）' : '未配置（使用后备值）')
    
    // 移除弹窗拦截：直接尝试连接，不检查环境变量
    if (!supabase) {
      console.error('[更新API] Supabase客户端未初始化，详细错误信息:')
      console.error('[更新API] - 客户端对象:', supabase)
      console.error('[更新API] - 环境变量URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.error('[更新API] - 环境变量Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已配置（已隐藏）' : '未配置')
      console.error('[更新API] - 请检查 lib/supabase.ts 中的后备值配置')
      
      return NextResponse.json(
        { 
          error: "数据库连接失败，请检查控制台获取详细错误信息",
          details: "Supabase客户端未初始化，请查看服务器控制台日志"
        },
        { status: 500 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: "请求体格式错误，需要JSON格式" },
        { status: 400 }
      )
    }

    const {
      restaurant_id,
      name,
      phone,
      restaurant_name,
      latitude,
      longitude,
      address,
    } = body

    if (!restaurant_id) {
      return NextResponse.json(
        { error: "缺少必要参数: restaurant_id" },
        { status: 400 }
      )
    }

    // 构建更新对象
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name) updateData.contact_name = name
    if (phone) updateData.contact_phone = phone
    if (restaurant_name) updateData.name = restaurant_name
    if (latitude !== undefined && longitude !== undefined) {
      updateData.latitude = latitude
      updateData.longitude = longitude
      updateData.location = `${latitude},${longitude}` // 更新location字段
    }
    if (address) updateData.address = address

    // 更新餐厅信息
    const { data: updatedRestaurant, error: updateError } = await supabase
      .from("restaurants")
      .update(updateData)
      .eq("id", restaurant_id)
      .select("id, name, qr_token, status, contact_name, contact_phone, latitude, longitude, address")
      .single()

    if (updateError) {
      console.error("更新餐厅信息失败:", updateError)
      return NextResponse.json(
        { error: "更新餐厅信息失败", details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "餐厅信息更新成功",
      data: updatedRestaurant,
    })
  } catch (error) {
    console.error("更新餐厅信息错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    )
  }
}

