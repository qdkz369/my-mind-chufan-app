/**
 * 搜索 API
 * 
 * GET /api/search - 全局搜索（订单、设备、报修等）
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const keyToUse = serviceRoleKey || anonKey
    
    if (!supabaseUrl || !keyToUse) {
      return NextResponse.json(
        { error: "数据库配置错误" },
        { status: 500 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get("keyword")
    const restaurantId = searchParams.get("restaurant_id")
    const type = searchParams.get("type") // all, orders, devices, repairs

    if (!keyword || keyword.trim() === "") {
      return NextResponse.json({
        success: true,
        data: {
          orders: [],
          devices: [],
          repairs: [],
        },
      })
    }

    if (!restaurantId) {
      return NextResponse.json(
        { error: "缺少必需参数: restaurant_id" },
        { status: 400 }
      )
    }

    const searchKeyword = `%${keyword.trim()}%`
    const results: any = {
      orders: [],
      devices: [],
      repairs: [],
    }

    // 搜索订单（delivery_orders）
    if (!type || type === "all" || type === "orders") {
      const { data: ordersData } = await supabaseClient
        .from("delivery_orders")
        .select("id, order_number, service_type, status, amount, created_at")
        .eq("restaurant_id", restaurantId)
        .or(`order_number.ilike.${searchKeyword},service_type.ilike.${searchKeyword}`)
        .order("created_at", { ascending: false })
        .limit(10)

      if (ordersData) {
        results.orders = ordersData.map((order: any) => ({
          id: order.id,
          type: "order",
          title: `订单 ${order.order_number}`,
          description: `${order.service_type} - ${order.status}`,
          amount: order.amount,
          created_at: order.created_at,
          url: `/orders?id=${order.id}`,
        }))
      }
    }

    // 搜索设备
    if (!type || type === "all" || type === "devices") {
      const { data: devicesData } = await supabaseClient
        .from("devices")
        .select("device_id, model, address, status")
        .eq("restaurant_id", restaurantId)
        .or(`device_id.ilike.${searchKeyword},model.ilike.${searchKeyword},address.ilike.${searchKeyword}`)
        .limit(10)

      if (devicesData) {
        results.devices = devicesData.map((device: any) => ({
          id: device.device_id,
          type: "device",
          title: device.model || device.device_id,
          description: `${device.address} - ${device.status}`,
          created_at: device.created_at,
          url: `/devices?id=${device.device_id}`,
        }))
      }
    }

    // 搜索报修订单（repair_orders）
    if (!type || type === "all" || type === "repairs") {
      const { data: repairsData } = await supabaseClient
        .from("repair_orders")
        .select("id, order_number, description, status, created_at")
        .eq("restaurant_id", restaurantId)
        .or(`order_number.ilike.${searchKeyword},description.ilike.${searchKeyword}`)
        .order("created_at", { ascending: false })
        .limit(10)

      if (repairsData) {
        results.repairs = repairsData.map((repair: any) => ({
          id: repair.id,
          type: "repair",
          title: `报修单 ${repair.order_number || repair.id.substring(0, 8)}`,
          description: repair.description || "无描述",
          status: repair.status,
          created_at: repair.created_at,
          url: `/repair/create?id=${repair.id}`,
        }))
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      total: results.orders.length + results.devices.length + results.repairs.length,
    })
  } catch (error: any) {
    console.error("[搜索API] 错误:", error)
    return NextResponse.json(
      { error: "搜索失败", details: error.message },
      { status: 500 }
    )
  }
}
