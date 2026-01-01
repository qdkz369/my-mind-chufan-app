import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// POST: 注册新餐厅
export async function POST(request: Request) {
  try {
    // 添加调试日志
    console.log('[注册API] Supabase客户端状态:', supabase ? '已初始化' : '未初始化')
    console.log('[注册API] 环境变量URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '未配置（使用后备值）')
    console.log('[注册API] 环境变量Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已配置（已隐藏）' : '未配置（使用后备值）')
    console.log('[注册API] 高德地图Key:', process.env.NEXT_PUBLIC_AMAP_KEY ? '已配置（已隐藏）' : '未配置')
    
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
    // 检查经纬度是否有效（不为 undefined、null、0，且为有效数字）
    const hasLocation = latitude !== undefined && latitude !== null && 
                       longitude !== undefined && longitude !== null &&
                       !isNaN(Number(latitude)) && !isNaN(Number(longitude)) &&
                       Number(latitude) !== 0 && Number(longitude) !== 0

    // 先检查手机号是否已存在（防止重复注册）
    console.log('[注册API] 检查手机号是否已存在:', phone)
    const { data: existingRestaurantByPhone, error: checkPhoneError } = await supabase
      .from("restaurants")
      .select("id, name, qr_token, status, contact_name, contact_phone, latitude, longitude, address")
      .eq("contact_phone", phone)
      .maybeSingle()

    if (checkPhoneError && checkPhoneError.code !== 'PGRST116') {
      // PGRST116 表示未找到记录，这是正常的
      console.error("[注册API] 检查手机号时出错:", checkPhoneError)
      return NextResponse.json(
        { 
          error: "检查手机号失败",
          details: checkPhoneError.message
        },
        { status: 500 }
      )
    }

    // 如果手机号已存在，执行更新操作而不是插入
    if (existingRestaurantByPhone) {
      console.log('[注册API] 手机号已存在，执行更新操作:', existingRestaurantByPhone.id)
      
      // 构建更新数据对象
      const updateData: any = {}

      // 更新基本信息
      if (name) updateData.contact_name = name
      if (restaurant_name) updateData.name = restaurant_name
      
      // 处理经纬度字段
      if (hasLocation) {
        updateData.latitude = Number(latitude)
        updateData.longitude = Number(longitude)
        updateData.location = `${updateData.latitude},${updateData.longitude}`
      } else if (latitude === null || longitude === null) {
        // 如果明确传递了 null，则清空定位信息
        updateData.latitude = null
        updateData.longitude = null
        updateData.location = null
      }
      
      // 处理地址字段
      if (address !== undefined) {
        if (address && address.trim() !== "") {
          updateData.address = address.trim()
        } else {
          updateData.address = "地址待完善"
        }
      }

      console.log('[注册API] 准备更新的数据:', JSON.stringify(updateData, null, 2))

      // 执行更新
      const { data: updateResult, error: updateError } = await supabase
        .from("restaurants")
        .update(updateData)
        .eq("id", existingRestaurantByPhone.id)
        .select("id, name, qr_token, status, contact_name, contact_phone, latitude, longitude, address")

      if (updateError) {
        console.error("[注册API] 更新餐厅记录失败:", updateError)
        console.error("[注册API] 错误代码:", updateError.code)
        console.error("[注册API] 错误详情:", updateError.details)
        console.error("[注册API] 错误提示:", updateError.hint)
        console.error("[注册API] 更新数据:", JSON.stringify(updateData, null, 2))
        return NextResponse.json(
          { 
            error: "更新餐厅记录失败",
            details: updateError.message || "未知错误",
            code: updateError.code,
            hint: updateError.hint
          },
          { status: 500 }
        )
      }

      // 检查返回数据
      if (!updateResult || updateResult.length === 0) {
        console.warn("[注册API] 更新成功但未返回数据，使用原有数据")
        // 即使没有返回数据，也返回成功，使用原有数据
        return NextResponse.json({
          success: true,
          message: "餐厅信息更新成功（手机号已存在，已更新现有记录）",
          data: {
            restaurant_id: existingRestaurantByPhone.id,
            qr_token: existingRestaurantByPhone.qr_token,
            name: existingRestaurantByPhone.name,
            status: existingRestaurantByPhone.status || "unactivated",
          },
        })
      }

      const updatedRestaurant = updateResult[0]
      console.log('[注册API] 更新成功，返回数据:', JSON.stringify(updatedRestaurant, null, 2))

      return NextResponse.json({
        success: true,
        message: "餐厅信息更新成功（手机号已存在，已更新现有记录）",
        data: {
          restaurant_id: updatedRestaurant.id || existingRestaurantByPhone.id,
          qr_token: updatedRestaurant.qr_token || existingRestaurantByPhone.qr_token,
          name: updatedRestaurant.name || existingRestaurantByPhone.name,
          status: updatedRestaurant.status || existingRestaurantByPhone.status || "unactivated",
        },
      })
    }

    // 手机号不存在，执行新注册流程
    console.log('[注册API] 手机号不存在，执行新注册流程')

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
      const { data: existingRestaurant, error: checkError } = await supabase
        .from("restaurants")
        .select("id")
        .eq("qr_token", newToken)
        .maybeSingle()

      // 如果查询出错或没有找到记录，说明 token 可用
      if (checkError || !existingRestaurant) {
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
    // 构建插入数据对象，确保数据类型正确
    // 注意：不设置 created_at 和 updated_at，让数据库自动处理（使用 DEFAULT NOW() 和触发器）
    const insertData: any = {
      name: restaurant_name,
      qr_token: newToken,
      total_refilled: 0,
      contact_name: name,
      contact_phone: phone,
    }
    
    // 如果表中有 status 字段，设置状态为未激活
    // 如果表中没有此字段，不设置也不会报错（Supabase 会忽略不存在的字段）
    insertData.status = "unactivated"
    
    // 处理地址字段
    if (address && address.trim() !== "") {
      insertData.address = address.trim()
    } else {
      insertData.address = "地址待完善"
    }
    
    // 处理经纬度字段：确保数据类型为数字或 null
    if (hasLocation) {
      // 转换为数字类型，确保精度
      insertData.latitude = Number(latitude)
      insertData.longitude = Number(longitude)
      // location 字段存储格式化的坐标字符串（如果表中有此字段）
      insertData.location = `${insertData.latitude},${insertData.longitude}`
    } else {
      // 如果没有定位信息，设置为 null
      insertData.latitude = null
      insertData.longitude = null
      insertData.location = null
    }

    console.log('[注册API] 准备插入的数据:', JSON.stringify(insertData, null, 2))
    
    // 执行插入
    const { data: insertResult, error: insertError } = await supabase
      .from("restaurants")
      .insert(insertData)
      .select()

    if (insertError) {
      console.error("[注册API] 创建餐厅记录失败，详细错误信息:")
      console.error("[注册API] - 错误代码:", insertError.code)
      console.error("[注册API] - 错误消息:", insertError.message)
      console.error("[注册API] - 错误详情:", insertError.details)
      console.error("[注册API] - 错误提示:", insertError.hint)
      console.error("[注册API] - 插入数据:", JSON.stringify(insertData, null, 2))
      
      return NextResponse.json(
        { 
          error: "创建餐厅记录失败，请检查控制台获取详细错误信息",
          details: insertError.message,
          code: insertError.code
        },
        { status: 500 }
      )
    }

    // 检查返回数据
    if (!insertResult || insertResult.length === 0) {
      console.error("[注册API] 插入成功但未返回数据")
      // 即使没有返回数据，也尝试返回成功，因为插入可能已经成功
      return NextResponse.json({
        success: true,
        message: "餐厅注册成功（数据已保存，但无法获取完整返回信息）",
        data: {
          restaurant_id: null,
          qr_token: newToken,
          name: restaurant_name,
          status: "unactivated",
        },
      })
    }

    // 获取第一条记录（应该只有一条）
    const newRestaurant = insertResult[0]

    console.log('[注册API] 插入成功，返回数据:', JSON.stringify(newRestaurant, null, 2))

    return NextResponse.json({
      success: true,
      message: "餐厅注册成功",
      data: {
        restaurant_id: newRestaurant.id,
        qr_token: newRestaurant.qr_token || newToken,
        name: newRestaurant.name || restaurant_name,
        status: newRestaurant.status || "unactivated",
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
    // 注意：不手动设置 updated_at，让数据库触发器自动更新
    const updateData: any = {}

    if (name) updateData.contact_name = name
    if (phone) updateData.contact_phone = phone
    if (restaurant_name) updateData.name = restaurant_name
    
    // 处理经纬度字段：确保数据类型正确
    const hasLocation = latitude !== undefined && latitude !== null && 
                       longitude !== undefined && longitude !== null &&
                       !isNaN(Number(latitude)) && !isNaN(Number(longitude)) &&
                       Number(latitude) !== 0 && Number(longitude) !== 0
    
    if (hasLocation) {
      // 转换为数字类型，确保精度
      updateData.latitude = Number(latitude)
      updateData.longitude = Number(longitude)
      // location 字段存储格式化的坐标字符串（如果表中有此字段）
      updateData.location = `${updateData.latitude},${updateData.longitude}`
    } else if (latitude === null || longitude === null) {
      // 如果明确传递了 null，则清空定位信息
      updateData.latitude = null
      updateData.longitude = null
      updateData.location = null
    }
    
    if (address !== undefined) {
      if (address && address.trim() !== "") {
        updateData.address = address.trim()
      } else {
        updateData.address = "地址待完善"
      }
    }

    console.log('[更新API] 准备更新的数据:', JSON.stringify(updateData, null, 2))

    // 更新餐厅信息
    const { data: updateResult, error: updateError } = await supabase
      .from("restaurants")
      .update(updateData)
      .eq("id", restaurant_id)
      .select("id, name, qr_token, status, contact_name, contact_phone, latitude, longitude, address")

    if (updateError) {
      console.error("[更新API] 更新餐厅信息失败:", updateError)
      console.error("[更新API] 错误代码:", updateError.code)
      console.error("[更新API] 错误详情:", updateError.details)
      console.error("[更新API] 错误提示:", updateError.hint)
      console.error("[更新API] 更新数据:", JSON.stringify(updateData, null, 2))
      console.error("[更新API] 餐厅ID:", restaurant_id)
      return NextResponse.json(
        { 
          error: "更新餐厅信息失败", 
          details: updateError.message || "未知错误",
          code: updateError.code,
          hint: updateError.hint
        },
        { status: 500 }
      )
    }

    // 检查返回数据
    if (!updateResult || updateResult.length === 0) {
      console.error("[更新API] 更新成功但未返回数据，可能记录不存在")
      return NextResponse.json(
        { 
          error: "更新餐厅信息失败",
          details: "未找到对应的餐厅记录，请检查 restaurant_id 是否正确"
        },
        { status: 404 }
      )
    }

    // 获取第一条记录（应该只有一条）
    const updatedRestaurant = updateResult[0]

    console.log('[更新API] 更新成功，返回数据:', JSON.stringify(updatedRestaurant, null, 2))

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

