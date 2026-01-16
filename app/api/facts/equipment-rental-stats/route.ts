/**
 * Facts API - 设备租赁统计数据（Read-Only）
 * 
 * GET /api/facts/equipment-rental-stats
 * 
 * 返回结构：
 * {
 *   "success": true,
 *   "available_count": number,          // 可租赁设备总数
 *   "satisfaction_rate": number,        // 满意度（0-100）
 * }
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // 优先使用 service role key，如果没有则使用 anon key（与设备列表API保持一致）
    const keyToUse = serviceRoleKey || anonKey
    
    if (!supabaseUrl || !keyToUse) {
      console.error("[设备租赁统计API] Supabase URL 或密钥未配置")
      return NextResponse.json({
        success: true,
        available_count: 0,
        satisfaction_rate: 0,
      })
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // 1. 查询可租赁设备总数
    // 统计所有状态为 active 的设备，并计算 available_quantity 的总和
    // 注意：与设备列表API保持一致，只查询 status = "active" 的设备
    const { data: equipmentData, error: equipmentError } = await supabaseClient
      .from("equipment")
      .select("available_quantity")
      .eq("status", "active")

    let available_count = 0
    if (!equipmentError && equipmentData) {
      // 计算所有活跃设备的 available_quantity 总和
      available_count = equipmentData.reduce((sum, item) => {
        const qty = item.available_quantity || 0
        return sum + qty
      }, 0)
      
      // 调试日志
      console.log("[设备租赁统计API] 查询结果:", {
        total_devices: equipmentData.length,
        total_available: available_count,
        sample_quantities: equipmentData.slice(0, 5).map((e: any) => e.available_quantity)
      })
    } else if (equipmentError) {
      console.error("[设备租赁统计API] 查询设备失败:", equipmentError)
    }

    // 2. 查询满意度
    // 从 rental_orders 表中查询已完成订单的评价
    // 如果 rental_orders 表有 rating 或 satisfaction 字段，则计算平均值
    // 如果没有，则尝试从其他评价表查询
    
    // 先检查 rental_orders 表是否有评价相关字段
    // 假设有 rating 字段（1-5分），需要转换为百分比（0-100）
    const { data: completedOrdersData, error: ordersError } = await supabaseClient
      .from("rental_orders")
      .select("rating")
      .eq("order_status", "completed")
      .not("rating", "is", null)

    let satisfaction_rate = 0
    if (!ordersError && completedOrdersData && completedOrdersData.length > 0) {
      // 如果有 rating 字段（假设是1-5分制），转换为百分比
      const ratings = completedOrdersData
        .map((order: any) => order.rating)
        .filter((rating: any) => rating !== null && rating !== undefined)
      
      if (ratings.length > 0) {
        // 假设 rating 是 1-5 分制，转换为 0-100 的百分比
        const avgRating = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
        satisfaction_rate = Math.round((avgRating / 5) * 100)
      }
    }

    // 如果没有评价数据，尝试从其他可能的评价表查询
    // 例如：rental_reviews 表（如果存在）
    if (satisfaction_rate === 0) {
      // 尝试查询 rental_reviews 表（如果存在）
      const { data: reviewsData, error: reviewsError } = await supabaseClient
        .from("rental_reviews")
        .select("rating")
        .not("rating", "is", null)
        .limit(100) // 限制查询数量

      if (!reviewsError && reviewsData && reviewsData.length > 0) {
        const ratings = reviewsData
          .map((review: any) => review.rating)
          .filter((rating: any) => rating !== null && rating !== undefined)
        
        if (ratings.length > 0) {
          // 假设 rating 是 1-5 分制，转换为 0-100 的百分比
          const avgRating = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
          satisfaction_rate = Math.round((avgRating / 5) * 100)
        }
      }
    }

    // 如果仍然没有评价数据，返回默认值 0（前端可以显示为 "--" 或 "暂无数据"）
    // 或者可以返回一个合理的默认值，比如 95（如果业务需要）

    return NextResponse.json({
      success: true,
      available_count: available_count,
      satisfaction_rate: satisfaction_rate,
    })
  } catch (error) {
    console.error("[设备租赁统计API] 处理请求失败:", error)
    return NextResponse.json({
      success: true,
      available_count: 0,
      satisfaction_rate: 0,
    })
  }
}
