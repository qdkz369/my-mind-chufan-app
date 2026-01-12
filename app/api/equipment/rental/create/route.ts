// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，已使用 Anon Key，需完善 RLS

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import { getCurrentCompanyId, getCurrentUserId } from "@/lib/multi-tenant"

/**
 * POST: 创建租赁订单
 */
export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      restaurant_id,
      user_id,
      equipment_id,
      quantity,
      rental_period, // 租期（月）
      start_date, // 租赁开始日期
      delivery_address,
      contact_phone,
      notes,
      payment_method = "cash", // 支付方式：cash, alipay, wechat, bank_transfer, finance_api
      provider_id, // 供应商ID
      funding_type = "direct", // 财务模式：direct(直租)、third_party(第三方融资)
    } = body

    // 验证必需字段
    if (!restaurant_id || !equipment_id || !rental_period || !start_date) {
      return NextResponse.json(
        { error: "缺少必需字段" },
        { status: 400 }
      )
    }

    // 🔒 多租户隔离：获取当前用户的 company_id
    const currentUserId = user_id || await getCurrentUserId(request)
    const currentCompanyId = provider_id || await getCurrentCompanyId(request)
    
    // 如果提供了 provider_id，验证用户是否有权限
    if (provider_id && currentUserId) {
      const { verifyCompanyAccess } = await import("@/lib/multi-tenant")
      const hasAccess = await verifyCompanyAccess(currentUserId, provider_id)
      if (!hasAccess) {
        return NextResponse.json(
          { error: "无权为此供应商创建订单" },
          { status: 403 }
        )
      }
    }
    
    // 如果没有提供 provider_id，使用当前用户的 company_id
    const finalProviderId = provider_id || currentCompanyId

    // 获取设备信息
    const { data: equipment, error: equipmentError } = await supabase
      .from("equipment")
      .select("*")
      .eq("id", equipment_id)
      .single()

    if (equipmentError || !equipment) {
      return NextResponse.json(
        { error: "设备不存在" },
        { status: 404 }
      )
    }

    // 检查库存
    const requestedQuantity = quantity || 1
    if (equipment.available_quantity < requestedQuantity) {
      return NextResponse.json(
        { error: `库存不足，当前可租数量：${equipment.available_quantity}` },
        { status: 400 }
      )
    }

    // 验证租期
    if (rental_period < equipment.min_rental_period) {
      return NextResponse.json(
        { error: `最短租期为 ${equipment.min_rental_period} 个月` },
        { status: 400 }
      )
    }

    if (equipment.max_rental_period && rental_period > equipment.max_rental_period) {
      return NextResponse.json(
        { error: `最长租期为 ${equipment.max_rental_period} 个月` },
        { status: 400 }
      )
    }

    // 计算金额
    const monthlyPrice = equipment.monthly_rental_price
    const totalAmount = monthlyPrice * rental_period * requestedQuantity
    const depositAmount = equipment.deposit_amount * requestedQuantity

    // 计算结束日期
    const startDate = new Date(start_date)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + rental_period)

    // 生成订单号
    const orderNumber = `RENT${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // 创建租赁订单
    const rentalOrderData: any = {
      order_number: orderNumber,
      restaurant_id,
      user_id: currentUserId,
      equipment_id,
      quantity: requestedQuantity,
      rental_period,
      start_date: start_date,
      end_date: endDate.toISOString().split("T")[0],
      monthly_rental_price: monthlyPrice,
      total_amount: totalAmount,
      deposit_amount: depositAmount,
      payment_method,
      payment_status: payment_method === "finance_api" ? "pending" : "pending", // 如果是金融API，需要等待确认
      order_status: "pending",
      delivery_address: delivery_address || null,
      contact_phone: contact_phone || null,
      notes: notes || null,
      provider_id: finalProviderId || null, // 供应商ID（多租户隔离）
      funding_type: funding_type || "direct", // 财务模式
      is_signed: false, // 默认未签收
      setup_photo: [], // 默认无安装照片
    }

    // 如果使用第三方金融机构API，预留接口
    if (payment_method === "finance_api") {
      // TODO: 调用第三方金融机构API
      // const financeResult = await callFinanceAPI(rentalOrderData)
      // rentalOrderData.finance_api_order_id = financeResult.orderId
      // rentalOrderData.finance_api_status = financeResult.status
      rentalOrderData.finance_api_order_id = null
      rentalOrderData.finance_api_status = "pending"
    }

    const { data: rentalOrder, error: createError } = await supabase
      .from("rental_orders")
      .insert(rentalOrderData)
      .select("*")
      .single()

    if (createError) {
      console.error("[租赁订单API] 创建失败:", createError)
      return NextResponse.json(
        { error: "创建租赁订单失败", details: createError.message },
        { status: 500 }
      )
    }

    // 更新设备库存（暂时不减少，等订单确认后再减少）
    // 这里可以根据业务需求决定是否立即减少库存

    return NextResponse.json({
      success: true,
      data: rentalOrder,
      message: "租赁订单创建成功",
    })
  } catch (err: any) {
    console.error("[租赁订单API] 错误:", err)
    return NextResponse.json(
      { error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}


