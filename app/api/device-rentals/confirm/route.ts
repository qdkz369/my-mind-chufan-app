/**
 * 客户确认设备租赁 API
 *
 * POST /api/device-rentals/confirm
 *
 * 客户端（对应客户/餐厅）确认租赁后形成租赁事实关系：
 * - 将 status 从 pending_confirmation 改为 active
 * - 写入 customer_confirmed_at
 * - 同批（同一 rental_batch_id）可批量确认
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

export async function POST(request: Request) {
  try {
    let userContext = await getUserContext(request)
    const clientRestaurantId = request.headers.get("x-restaurant-id")?.trim() || null
    if (!userContext && !clientRestaurantId) {
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
        { success: false, error: "服务器配置错误" },
        { status: 500 }
      )
    }
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey || anonKey!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const body = await request.json()
    const { rental_id, rental_batch_id, agreement_id } = body

    if (!rental_id && !rental_batch_id) {
      return NextResponse.json(
        { success: false, error: "请提供 rental_id 或 rental_batch_id" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const updatePayload: Record<string, unknown> = {
      status: "active",
      customer_confirmed_at: now,
      updated_at: now,
    }
    if (agreement_id) updatePayload.agreement_id = agreement_id

    if (rental_batch_id) {
      const { data: batchRows, error: fetchBatchError } = await supabase
        .from("device_rentals")
        .select("id, company_id")
        .eq("rental_batch_id", rental_batch_id)
        .eq("status", "pending_confirmation")

      if (fetchBatchError || !batchRows?.length) {
        return NextResponse.json(
          { success: false, error: "该批租赁不存在或已确认" },
          { status: 404 }
        )
      }
      if (
        userContext.role !== "super_admin" &&
        userContext.companyId &&
        !batchRows.every((r) => (r as { company_id?: string }).company_id === userContext.companyId)
      ) {
        return NextResponse.json(
          { success: false, error: "无权确认该批租赁" },
          { status: 403 }
        )
      }

      const { data: updated, error } = await supabase
        .from("device_rentals")
        .update(updatePayload)
        .eq("rental_batch_id", rental_batch_id)
        .eq("status", "pending_confirmation")
        .select("*")

      if (error) {
        console.error("[设备租赁确认API] 批量确认失败:", error)
        return NextResponse.json(
          { success: false, error: "确认失败", details: error.message },
          { status: 500 }
        )
      }
      return NextResponse.json({
        success: true,
        data: updated,
        message: "本批租赁已确认，租赁事实关系已形成。",
      })
    }

    const { data: row, error: fetchError } = await supabase
      .from("device_rentals")
      .select("id, status, rental_batch_id, company_id, restaurant_id")
      .eq("id", rental_id)
      .single()

    if (fetchError || !row) {
      return NextResponse.json(
        { success: false, error: "租赁记录不存在" },
        { status: 404 }
      )
    }
    if (row.status !== "pending_confirmation") {
      return NextResponse.json(
        { success: false, error: "该记录无需确认或已确认" },
        { status: 400 }
      )
    }
    const rowRestaurantId = (row as { restaurant_id?: string }).restaurant_id
    const rowCompanyId = (row as { company_id?: string }).company_id
    if (clientRestaurantId) {
      if (rowRestaurantId !== clientRestaurantId) {
        return NextResponse.json(
          { success: false, error: "无权确认该租赁" },
          { status: 403 }
        )
      }
    } else if (
      userContext?.role !== "super_admin" &&
      userContext?.companyId &&
      rowCompanyId !== userContext.companyId
    ) {
      return NextResponse.json(
        { success: false, error: "无权确认该租赁" },
        { status: 403 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from("device_rentals")
      .update(updatePayload)
      .eq("id", rental_id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[设备租赁确认API] 确认失败:", updateError)
      return NextResponse.json(
        { success: false, error: "确认失败", details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "租赁已确认，租赁事实关系已形成。",
    })
  } catch (err: any) {
    console.error("[设备租赁确认API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
