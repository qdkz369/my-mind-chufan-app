import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// POST: 为餐厅生成或更新 qr_token
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

    const { restaurant_id } = body

    if (!restaurant_id) {
      return NextResponse.json(
        { error: "缺少必要参数: restaurant_id" },
        { status: 400 }
      )
    }

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
    let newToken: string
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

    if (tokenExists) {
      return NextResponse.json(
        { error: "生成唯一Token失败，请重试" },
        { status: 500 }
      )
    }

    // 先检查餐厅是否存在
    const { data: existingRestaurant, error: checkError } = await supabase
      .from("restaurants")
      .select("id, name, qr_token")
      .eq("id", restaurant_id)
      .single()

    if (checkError && checkError.code === "PGRST116") {
      // 餐厅不存在，创建一个新记录
      const { data: newRestaurant, error: createError } = await supabase
        .from("restaurants")
        .insert({
          id: restaurant_id,
          name: "未命名餐厅",
          qr_token: newToken,
          total_refilled: 0,
        })
        .select("id, name, qr_token")
        .single()

      if (createError) {
        console.error("创建餐厅记录失败:", createError)
        return NextResponse.json(
          { error: "创建餐厅记录失败", details: createError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "餐厅记录已创建，qr_token生成成功",
        data: {
          restaurant_id: newRestaurant.id,
          qr_token: newRestaurant.qr_token,
          name: newRestaurant.name,
        },
      })
    }

    if (checkError) {
      console.error("检查餐厅记录失败:", checkError)
      return NextResponse.json(
        { error: "检查餐厅记录失败", details: checkError.message },
        { status: 500 }
      )
    }

    // 更新餐厅的 qr_token
    const { data: updatedRestaurant, error: updateError } = await supabase
      .from("restaurants")
      .update({ 
        qr_token: newToken,
        updated_at: new Date().toISOString()
      })
      .eq("id", restaurant_id)
      .select("id, name, qr_token")
      .single()

    if (updateError) {
      console.error("更新qr_token失败:", updateError)
      return NextResponse.json(
        { error: "更新qr_token失败", details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "qr_token生成成功",
      data: {
        restaurant_id: updatedRestaurant.id,
        qr_token: updatedRestaurant.qr_token,
        name: updatedRestaurant.name,
      },
    })
  } catch (error) {
    console.error("生成qr_token错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    )
  }
}

