/**
 * 对公支付 - 上传转账凭证
 * POST /api/orders/[id]/upload-voucher
 * Body: FormData { file: File }
 * 强制记录 IP、经纬度、时间戳到 audit_logs（事实驱动证据链）
 */

import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * 获取客户端真实 IP，用于审计证据链。
 * 优先使用 x-forwarded-for（CDN/反向代理如 Cloudflare、Nginx 会写入），
 * 格式为 "client, proxy1, proxy2"，取第一段为原始客户端 IP。
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown"
  }
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orderId = (await params).id
    const clientRestaurantId = request.headers.get("x-restaurant-id")

    let userContext = null
    try {
      userContext = await getUserContext(request)
    } catch {
      // 客户端用户无 userContext
    }

    // 至少需要 restaurant_id（客户端）或 userContext（管理端）
    if (!clientRestaurantId?.trim() && !userContext) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录或提供 restaurant_id" },
        { status: 401 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const { data: orderData, error: oErr } = await supabase
      .from("delivery_orders")
      .select("id, restaurant_id, company_id, payment_method, payment_status")
      .eq("id", orderId)
      .single()

    if (oErr || !orderData) {
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      )
    }

    if (orderData.payment_method !== "corporate") {
      return NextResponse.json(
        { success: false, error: "该订单不是对公支付订单" },
        { status: 400 }
      )
    }

    // 权限校验：订单必须属于当前用户的餐厅
    if (clientRestaurantId && orderData.restaurant_id !== clientRestaurantId) {
      return NextResponse.json(
        { success: false, error: "无权操作此订单" },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const latStr = formData.get("lat") as string | null
    const lonStr = formData.get("lon") as string | null

    if (!file || !file.size) {
      return NextResponse.json(
        { success: false, error: "缺少凭证文件" },
        { status: 400 }
      )
    }

    const isImage = file.type.startsWith("image/")
    const isPdf = file.type === "application/pdf"
    if (!isImage && !isPdf) {
      return NextResponse.json(
        { success: false, error: "仅支持图片或 PDF 文件" },
        { status: 400 }
      )
    }

    const companyId = orderData.company_id || "unknown"
    const folder = `companies/${companyId}/vouchers`
    const BUCKET_NAME = "delivery-proofs"
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const fileExt = file.name.split(".").pop() || "jpg"
    const fileName = `${orderId}_${timestamp}_${randomStr}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`${folder}/${fileName}`, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadErr) {
      console.error("[凭证上传API] Storage 失败:", uploadErr)
      return NextResponse.json(
        { success: false, error: "上传失败", details: uploadErr.message },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path)

    const voucherUrl = urlData.publicUrl

    const { error: updateErr } = await supabase
      .from("delivery_orders")
      .update({
        payment_voucher_url: voucherUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (updateErr) {
      console.error("[凭证上传API] 更新订单失败:", updateErr)
      return NextResponse.json(
        { success: false, error: "保存凭证链接失败" },
        { status: 500 }
      )
    }

    const clientIp = getClientIp(request)
    const lat = latStr ? parseFloat(latStr) : null
    const lon = lonStr ? parseFloat(lonStr) : null
    const latNum = lat !== null && !isNaN(lat) ? lat : null
    const lonNum = lon !== null && !isNaN(lon) ? lon : null

    const { error: auditErr } = await supabase.from("audit_logs").insert({
      actor_id: userContext?.userId ?? null,
      action: "VOUCHER_UPLOADED",
      target_type: "delivery_order",
      target_id: orderId,
      metadata: {
        voucher_url: voucherUrl,
        uploader_ip: clientIp,
        uploader_lat: latNum,
        uploader_lon: lonNum,
        uploaded_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    })

    if (auditErr) {
      console.warn("[凭证上传API] 审计日志写入失败（不影响主流程）:", auditErr)
    }

    return NextResponse.json({
      success: true,
      data: {
        voucher_url: voucherUrl,
        order_id: orderId,
      },
    })
  } catch (error) {
    console.error("[凭证上传API] 错误:", error)
    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
