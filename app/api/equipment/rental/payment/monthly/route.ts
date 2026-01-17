// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff, member
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：客户每月支付租金

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentUserId } from "@/lib/multi-tenant"

/**
 * POST: 客户支付每月租金
 * 请求体：
 * - order_id: 订单ID（必需）
 * - payment_month: 支付月份（格式：YYYY-MM，例如：2025-01）（必需）
 * - payment_amount: 支付金额（必需）
 * - payment_method: 支付方式（可选，默认：cash）
 * - payment_proof: 支付凭证（可选，图片URL）
 */
export async function POST(request: Request) {
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

    const body = await request.json()
    const {
      order_id,
      payment_month,
      payment_amount,
      payment_method = "cash",
      payment_proof = null,
    } = body

    // 验证必需字段
    if (!order_id || !payment_month || !payment_amount) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "order_id、payment_month 和 payment_amount 为必填项",
        },
        { status: 400 }
      )
    }

    // 验证订单是否存在
    const { data: order, error: orderError } = await supabaseClient
      .from("rental_orders")
      .select("*")
      .eq("id", order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        {
          success: false,
          error: "订单不存在",
          details: orderError?.message || "未找到指定订单",
        },
        { status: 404 }
      )
    }

    // 验证订单状态（只有 active 状态的订单才能支付）
    if (order.order_status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: "订单状态不允许支付",
          details: `当前订单状态为 ${order.order_status}，只有租赁中的订单才能支付`,
        },
        { status: 400 }
      )
    }

    // 获取现有的每月支付记录
    const monthlyPayments = (order.monthly_payments as any[]) || []

    // 检查该月份是否已支付
    const existingPayment = monthlyPayments.find((p) => p.month === payment_month)
    if (existingPayment && existingPayment.status === "paid") {
      return NextResponse.json(
        {
          success: false,
          error: "该月份已支付",
          details: `${payment_month} 的租金已经支付过了`,
        },
        { status: 400 }
      )
    }

    // 添加新的支付记录
    const newPayment = {
      month: payment_month,
      amount: parseFloat(payment_amount),
      payment_method,
      payment_proof,
      paid_at: new Date().toISOString(),
      status: "paid",
    }

    // 如果该月份已有记录（可能是部分支付），更新它；否则添加新记录
    const updatedPayments = existingPayment
      ? monthlyPayments.map((p) => (p.month === payment_month ? newPayment : p))
      : [...monthlyPayments, newPayment]

    // 更新订单的每月支付记录
    const { data: updatedOrder, error: updateError } = await supabaseClient
      .from("rental_orders")
      .update({
        monthly_payments: updatedPayments,
        // 如果所有月份都已支付，可以更新 payment_status
        // 这里简化处理，只更新 monthly_payments
      })
      .eq("id", order_id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[每月支付API] 更新失败:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: "更新失败",
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    // 📝 记录租赁事件：每月支付
    const currentUserId = await getCurrentUserId(request)
    const { error: eventError } = await supabaseClient
      .from("rental_events")
      .insert({
        rental_order_id: order_id,
        event_type: "monthly_payment",
        event_at: new Date().toISOString(),
        operator_id: currentUserId || null,
        meta: {
          payment_month: payment_month,
          payment_amount: parseFloat(payment_amount),
          payment_method: payment_method,
          payment_proof: payment_proof || null,
        },
      })

    if (eventError) {
      console.error("[每月支付API] 记录事件失败:", eventError)
      // 事件记录失败不影响主流程
    } else {
      console.log(`[每月支付API] 📝 租赁事件已记录：monthly_payment，订单ID: ${order_id}，月份: ${payment_month}`)
    }

    // 💰 更新账期记录：支付成功时更新对应账期的状态和已收金额
    const paymentAmount = parseFloat(payment_amount)
    const { data: billingCycle, error: billingCycleError } = await supabaseClient
      .from("rental_billing_cycles")
      .select("*")
      .eq("rental_order_id", order_id)
      .eq("cycle_month", payment_month)
      .single()

    if (billingCycle) {
      // 计算新的已收金额
      const newAmountPaid = (billingCycle.amount_paid || 0) + paymentAmount
      const amountDue = billingCycle.amount_due || 0
      
      // 确定状态：如果已收金额 >= 应收金额，状态为 paid，否则为 partial
      const newStatus = newAmountPaid >= amountDue ? "paid" : "partial"
      
      const { error: updateBillingCycleError } = await supabaseClient
        .from("rental_billing_cycles")
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
          paid_at: new Date().toISOString(),
          payment_method: payment_method || billingCycle.payment_method,
          payment_proof: payment_proof || billingCycle.payment_proof,
          updated_at: new Date().toISOString(),
        })
        .eq("id", billingCycle.id)

      if (updateBillingCycleError) {
        console.error("[每月支付API] 更新账期记录失败:", updateBillingCycleError)
        // 账期记录更新失败不影响主流程
      } else {
        console.log(`[每月支付API] 💰 账期记录已更新：订单ID: ${order_id}，月份: ${payment_month}，状态: ${newStatus}，已收: ${newAmountPaid}/${amountDue}`)
      }
    } else {
      // 如果没有找到对应的账期记录，记录警告（可能是历史订单）
      console.warn(`[每月支付API] ⚠️ 未找到对应的账期记录：订单ID: ${order_id}，月份: ${payment_month}`)
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: `${payment_month} 的租金支付成功`,
    })
  } catch (err: any) {
    console.error("[每月支付API] 错误:", err)
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
