// 用户头像上传 API
// 认证：x-restaurant-id 请求头（客户端用户）

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const BUCKET_NAME = "delivery-proofs"
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(request: NextRequest) {
  try {
    const restaurantId = request.headers.get("x-restaurant-id")
    if (!restaurantId || restaurantId.trim() === "") {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录" },
        { status: 401 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return NextResponse.json(
        { success: false, error: "服务器配置错误", details: "Supabase 未配置" },
        { status: 500 }
      )
    }

    const keyToUse = serviceRoleKey || anonKey!
    const supabase = createClient(supabaseUrl, keyToUse, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 验证餐厅存在
    const { data: restaurant, error: fetchError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .maybeSingle()

    if (fetchError || !restaurant) {
      return NextResponse.json(
        { success: false, error: "未找到餐厅信息" },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json(
        { success: false, error: "缺少文件" },
        { status: 400 }
      )
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "只支持图片文件（JPG、PNG 等）" },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "图片大小不能超过 2MB" },
        { status: 400 }
      )
    }

    const ext = file.name.split(".").pop() || "jpg"
    const fileName = `avatar_${Date.now()}.${ext}`
    const folder = `avatars/${restaurantId}`
    const path = `${folder}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error("[头像上传] 存储失败:", uploadError)
      return NextResponse.json(
        { success: false, error: "上传失败", details: uploadError.message },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path)

    // 更新 restaurants 表
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", restaurantId)

    if (updateError) {
      console.error("[头像上传] 更新数据库失败:", updateError)
      return NextResponse.json(
        { success: false, error: "保存失败", details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { url: urlData.publicUrl },
    })
  } catch (error) {
    console.error("[头像上传] 异常:", error)
    return NextResponse.json(
      {
        success: false,
        error: "服务器错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
