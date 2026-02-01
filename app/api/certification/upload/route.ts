// 资质认证 - 证件上传 API
// 认证：x-restaurant-id，仅本人可上传

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const BUCKET_NAME = "delivery-proofs"
const FOLDER = "certifications"
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]

export async function POST(request: NextRequest) {
  try {
    const restaurantId = request.headers.get("x-restaurant-id")?.trim()
    if (!restaurantId) {
      return NextResponse.json({ success: false, error: "未授权", details: "请先登录" }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !key) {
      return NextResponse.json({ success: false, error: "服务器配置错误" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .maybeSingle()

    if (!restaurant) {
      return NextResponse.json({ success: false, error: "未找到餐厅" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const type = formData.get("type") as string | null

    if (!file || !file.size) {
      return NextResponse.json({ success: false, error: "缺少文件" }, { status: 400 })
    }
    if (!type || !["business_license", "food_license"].includes(type)) {
      return NextResponse.json({ success: false, error: "无效的上传类型" }, { status: 400 })
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ success: false, error: "仅支持 JPG、PNG、WebP、PDF" }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: "文件不能超过 5MB" }, { status: 400 })
    }

    const ext = file.name.split(".").pop() || (file.type === "application/pdf" ? "pdf" : "jpg")
    const fileName = `${type}_${Date.now()}.${ext}`
    const path = `${FOLDER}/${restaurantId}/${fileName}`

    const buffer = new Uint8Array(await file.arrayBuffer())
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      console.error("[资质证件上传] 存储失败:", uploadError.message)
      return NextResponse.json({ success: false, error: "上传失败", details: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path)
    const url = urlData.publicUrl

    const col = type === "business_license" ? "business_license_url" : "food_license_url"
    const { data: existing } = await supabase
      .from("restaurant_certifications")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .maybeSingle()

    if (existing) {
      const { error: updateError } = await supabase
        .from("restaurant_certifications")
        .update({ [col]: url })
        .eq("restaurant_id", restaurantId)
      if (updateError) {
        console.error("[资质证件上传] 更新失败:", updateError.message)
        return NextResponse.json({ success: false, error: "保存失败" }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase.from("restaurant_certifications").insert({
        restaurant_id: restaurantId,
        [col]: url,
        status: "draft",
      })
      if (insertError) {
        console.error("[资质证件上传] 插入失败:", insertError.message)
        return NextResponse.json({ success: false, error: "保存失败" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, data: { url, type } })
  } catch (err: any) {
    console.error("[资质证件上传] 错误:", err)
    return NextResponse.json({ success: false, error: "服务器错误", details: err?.message }, { status: 500 })
  }
}
