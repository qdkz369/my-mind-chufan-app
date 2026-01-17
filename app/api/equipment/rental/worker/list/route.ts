// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: worker
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：工人端查询待配送的租赁订单

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * GET: 获取工人端可见的租赁订单列表
 * 查询参数：
 * - worker_id: 工人ID（可选，如果提供则只返回分配给该工人的订单）
 * - status: 订单状态（可选，默认查询 pending 和 confirmed 状态的订单）
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase 密钥未配置",
        },
        { status: 500 }
      )
    }

    const supabaseClient = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
      : createClient(supabaseUrl, anonKey!, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })

    const { searchParams } = new URL(request.url)
    const workerId = searchParams.get("worker_id")
    const status = searchParams.get("status") || "pending,confirmed" // 默认查询待确认和已确认的订单

    // 构建查询
    let query = supabaseClient
      .from("rental_orders")
      .select(`
        *,
        equipment:equipment_catalog(*),
        restaurants(*)
      `)
      .order("created_at", { ascending: false })

    // 如果提供了 worker_id，只查询分配给该工人的订单
    if (workerId) {
      query = query.eq("worker_id", workerId)
    } else {
      // 如果没有提供 worker_id，查询所有待配送的订单（worker_id 为 null 或订单状态为 pending/confirmed）
      query = query.or("worker_id.is.null,order_status.in.(pending,confirmed)")
    }

    // 状态筛选
    if (status && status !== "all") {
      const statusArray = status.split(",")
      if (statusArray.length === 1) {
        query = query.eq("order_status", statusArray[0])
      } else {
        query = query.in("order_status", statusArray)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error("[工人端租赁订单API] 查询失败:", error)
      return NextResponse.json(
        {
          success: false,
          error: "查询失败",
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (err: any) {
    console.error("[工人端租赁订单API] 错误:", err)
    return NextResponse.json(
      {
        success: false,
        error: "服务器错误",
        details: err.message,
      },
      { status: 500 }
    )
  }
}
