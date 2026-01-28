// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，已使用 Anon Key，需完善 RLS

import { NextResponse, NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { verifyCompanyAccess } from "@/lib/multi-tenant"

/**
 * POST: 创建租赁订单
 */
export async function POST(request: NextRequest) {
  try {
    // P0修复：强制使用统一用户上下文获取用户身份和权限
    let userContext
    try {
      userContext = await getUserContext(request)
      if (!userContext) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录",
          },
          { status: 401 }
        )
      }
      if (userContext.role === "super_admin") {
        console.log("[创建租赁订单API] Super Admin 访问，跳过多租户过滤")
      }
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      if (errorMessage.includes("未登录")) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录",
          },
          { status: 401 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: errorMessage,
        },
        { status: 403 }
      )
    }

    // P0修复：强制验证 companyId（super_admin 除外）
    if (!userContext.companyId && userContext.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "用户未关联任何公司",
        },
        { status: 403 }
      )
    }
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

    // 🔒 统一 company_id 来源：使用 getUserContext 而不是 getCurrentCompanyId
    const currentUserId = user_id || userContext?.userId
    const currentCompanyId = provider_id || userContext?.companyId
    
    // 如果提供了 provider_id，验证用户是否有权限（super_admin 跳过验证）
    if (provider_id && currentUserId && userContext?.role !== "super_admin") {
      const hasAccess = await verifyCompanyAccess(currentUserId, provider_id)
      if (!hasAccess) {
        return NextResponse.json(
          { error: "无权为此供应商创建订单" },
          { status: 403 }
        )
      }
    }
    
    // 如果没有提供 provider_id，使用当前用户的 company_id（super_admin 可以为 undefined）
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

    // 🔧 检查设备租赁状态：只有 available 状态的设备才能被预订
    if (equipment.rental_status && equipment.rental_status !== "available") {
      const statusMap: Record<string, string> = {
        reserved: "已预订",
        in_use: "使用中",
        maintenance: "维护中",
        retired: "已退役",
      }
      const statusText = statusMap[equipment.rental_status] || equipment.rental_status
      return NextResponse.json(
        { error: `设备当前状态为"${statusText}"，无法创建租赁订单` },
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

    // 🔧 设备状态机：下单成功后，将设备状态改为 reserved，并写入 current_rental_order_id
    if (rentalOrder && equipment_id) {
      const { error: equipmentUpdateError } = await supabase
        .from("equipment")
        .update({
          rental_status: "reserved",
          current_rental_order_id: rentalOrder.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", equipment_id)

      if (equipmentUpdateError) {
        console.error("[租赁订单API] 更新设备状态失败:", equipmentUpdateError)
        // 注意：即使设备状态更新失败，订单已创建，这里只记录错误，不阻止返回成功
        // 可以考虑后续增加补偿机制
      } else {
        console.log(`[租赁订单API] ✅ 设备状态已更新：${equipment_id} -> reserved，订单ID: ${rentalOrder.id}`)
      }
    }

    // 📝 记录租赁事件：创建订单
    if (rentalOrder) {
      // 💰 记录押金收取到 rental_deposits 表
      if (depositAmount > 0) {
        const { error: depositRecordError } = await supabase
          .from("rental_deposits")
          .insert({
            rental_order_id: rentalOrder.id,
            deposit_type: "received",
            amount: depositAmount,
            operator_id: currentUserId || null,
          })

        if (depositRecordError) {
          console.error("[租赁订单API] 记录押金收取失败:", depositRecordError)
          // 押金记录失败不影响主流程，但应该记录警告
        } else {
          console.log(`[租赁订单API] 💰 押金收取记录已创建：订单ID: ${rentalOrder.id}，金额: ${depositAmount}`)
        }
      }

      const { error: eventError } = await supabase
        .from("rental_events")
        .insert({
          rental_order_id: rentalOrder.id,
          event_type: "order_created",
          event_at: new Date().toISOString(),
          operator_id: currentUserId || null,
          meta: {
            order_number: rentalOrder.order_number,
            equipment_id: equipment_id,
            quantity: requestedQuantity,
            rental_period: rental_period,
            total_amount: totalAmount,
            payment_method: payment_method,
            provider_id: finalProviderId,
          },
        })

      if (eventError) {
        console.error("[租赁订单API] 记录事件失败:", eventError)
        // 事件记录失败不影响主流程
      } else {
        console.log(`[租赁订单API] 📝 租赁事件已记录：order_created，订单ID: ${rentalOrder.id}`)
      }

      // 💰 生成账期记录：为每个订单每月创建一条账期记录
      const billingCycles: any[] = []
      const startDateObj = new Date(start_date)
      
      for (let i = 0; i < rental_period; i++) {
        // 计算每个账期的月份和日期
        const cycleDate = new Date(startDateObj)
        cycleDate.setMonth(cycleDate.getMonth() + i)
        
        // 格式化为 YYYY-MM
        const cycleMonth = `${cycleDate.getFullYear()}-${String(cycleDate.getMonth() + 1).padStart(2, '0')}`
        
        // 计算到期日期：每个账期的到期日期为该月的最后一天，或者从开始日期起算每30天一个周期
        // 这里采用从开始日期起算，每个账期30天的逻辑
        const dueDate = new Date(startDateObj)
        dueDate.setDate(dueDate.getDate() + (i * 30)) // 第一个账期从开始日期，后续每个账期增加30天
        
        billingCycles.push({
          rental_order_id: rentalOrder.id,
          cycle_number: i + 1,
          cycle_month: cycleMonth,
          due_date: dueDate.toISOString().split("T")[0],
          amount_due: monthlyPrice * requestedQuantity,
          amount_paid: 0.00,
          status: "pending",
        })
      }

      if (billingCycles.length > 0) {
        const { error: billingCyclesError } = await supabase
          .from("rental_billing_cycles")
          .insert(billingCycles)

        if (billingCyclesError) {
          console.error("[租赁订单API] 生成账期记录失败:", billingCyclesError)
          // 账期记录生成失败不影响主流程
        } else {
          console.log(`[租赁订单API] 💰 已生成 ${billingCycles.length} 条账期记录，订单ID: ${rentalOrder.id}`)
        }
      }
    }

    // 更新设备库存（暂时不减少，等订单确认后再减少）
    // 这里可以根据业务需求决定是否立即减少库存

    // 📝 影子写入：同步写入 order_main 表
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && (serviceRoleKey || anonKey) && rentalOrder) {
        const adminClient = createClient(
          supabaseUrl,
          serviceRoleKey || anonKey!,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          }
        )

        // 创建 order_main 记录
        const { data: mainOrder, error: mainOrderError } = await adminClient
          .from("order_main")
          .insert({
            order_number: rentalOrder.order_number || `RENT${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            order_type: "rental",
            company_id: finalProviderId || null,
            status: rentalOrder.order_status || "pending",
            total_amount: rentalOrder.total_amount || 0,
            fuel_order_id: null,
            rental_order_id: rentalOrder.id,
            restaurant_id: restaurant_id,
            user_id: currentUserId || null,
            created_at: rentalOrder.created_at || new Date().toISOString(),
          })
          .select("id")
          .single()

        if (mainOrder && mainOrder.id) {
          // 更新 rental_orders 表的 main_order_id
          const { error: updateError } = await adminClient
            .from("rental_orders")
            .update({ main_order_id: mainOrder.id })
            .eq("id", rentalOrder.id)

          if (updateError) {
            console.error("[租赁订单API] 更新 rental_orders.main_order_id 失败:", updateError)
          } else {
            console.log(`[租赁订单API] ✅ 影子写入成功：order_main.id = ${mainOrder.id}, rental_orders.id = ${rentalOrder.id}`)
          }
        } else if (mainOrderError) {
          console.error("[租赁订单API] 影子写入 order_main 失败:", mainOrderError)
          // 影子写入失败不影响主流程，只记录错误
        }
      }
    } catch (shadowWriteError) {
      console.error("[租赁订单API] 影子写入异常（不影响主流程）:", shadowWriteError)
      // 影子写入失败不影响主流程
    }

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


