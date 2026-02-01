// 管理端发票 - 上传电子发票（PDF/图片）
// 认证：getUserContext（平台用户）

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

const BUCKET_NAME = "delivery-proofs"
const MAX_SIZE_IMAGE = 5 * 1024 * 1024 // 5MB
const MAX_SIZE_PDF = 10 * 1024 * 1024 // 10MB

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]
const ALLOWED_PDF = "application/pdf"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userContext = await getUserContext(request)
    if (!userContext) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录" },
        { status: 401 }
      )
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, error: "缺少发票ID" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !key) {
      return NextResponse.json(
        { success: false, error: "服务器配置错误" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: existing, error: fetchError } = await supabase
      .from("invoices")
      .select("id, restaurant_id")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "发票不存在" },
        { status: 404 }
      )
    }

    if (userContext.role !== "super_admin" && userContext.companyId) {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("company_id")
        .eq("id", existing.restaurant_id)
        .maybeSingle()
      if (!restaurant || restaurant.company_id !== userContext.companyId) {
        return NextResponse.json(
          { success: false, error: "无权操作该发票" },
          { status: 403 }
        )
      }
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file || !file.size) {
      return NextResponse.json(
        { success: false, error: "缺少文件" },
        { status: 400 }
      )
    }

    const isPdf = file.type === ALLOWED_PDF
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
    if (!isPdf && !isImage) {
      return NextResponse.json(
        { success: false, error: "仅支持 PDF 或图片（JPG、PNG、GIF、WebP）" },
        { status: 400 }
      )
    }

    const maxSize = isPdf ? MAX_SIZE_PDF : MAX_SIZE_IMAGE
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: isPdf ? "PDF 大小不能超过 10MB" : "图片大小不能超过 5MB",
        },
        { status: 400 }
      )
    }

    const ext = file.name.split(".").pop() || (isPdf ? "pdf" : "jpg")
    const fileName = `invoice_${Date.now()}.${ext}`
    const folder = `invoices/${id}`
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
      console.error("[发票上传] 存储失败:", uploadError)
      return NextResponse.json(
        { success: false, error: "上传失败", details: uploadError.message },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path)

    const updatePayload: Record<string, any> = { invoice_file_url: urlData.publicUrl }
    const { data: currentInv } = await supabase
      .from("invoices")
      .select("status")
      .eq("id", id)
      .maybeSingle()
    if (currentInv?.status === "processing") {
      updatePayload.status = "issued"
      updatePayload.issued_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from("invoices")
      .update(updatePayload)
      .eq("id", id)

    if (updateError) {
      console.error("[发票上传] 更新数据库失败:", updateError)
      return NextResponse.json(
        { success: false, error: "保存失败", details: updateError.message },
        { status: 500 }
      )
    }

    await supabase.from("audit_logs").insert({
      actor_id: userContext.userId ?? null,
      action: "INVOICE_FILE_UPLOADED",
      target_type: "invoice",
      target_id: id,
      metadata: {
        file_url: urlData.publicUrl,
        status_updated: currentInv?.status === "processing",
        uploaded_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "上传成功",
      data: { url: urlData.publicUrl },
    })
  } catch (err: any) {
    console.error("[发票上传] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
