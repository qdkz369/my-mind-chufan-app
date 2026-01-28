// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，已使用 Anon Key，需完善 RLS

import { NextResponse, NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { OrderStatus, ProductType } from "@/lib/types/order"

// POST: 创建订单并关联工人
export async function POST(request: NextRequest) {
  try {
    // P0修复：强制使用统一用户上下文获取用户身份和权限
    let userContext
    let clientRestaurantId: string | null = null
    
    try {
      userContext = await getUserContext(request)
      
      // 如果 getUserContext 失败，尝试客户端用户认证（通过 x-restaurant-id 请求头）
      if (!userContext) {
        clientRestaurantId = request.headers.get("x-restaurant-id")
        if (clientRestaurantId && clientRestaurantId.trim() !== "") {
          console.log("[创建燃料订单API] 使用客户端用户认证，restaurant_id:", clientRestaurantId)
          // 客户端用户认证成功，继续处理（稍后验证 restaurant_id）
        } else {
          return NextResponse.json(
            {
              success: false,
              error: "未授权",
              details: "请先登录",
            },
            { status: 401 }
          )
        }
      } else {
        if (userContext.role === "super_admin") {
          console.log("[创建燃料订单API] Super Admin 访问，跳过多租户过滤")
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      
      // 如果 getUserContext 失败，尝试客户端用户认证
      if (errorMessage.includes("未登录") || !userContext) {
        clientRestaurantId = request.headers.get("x-restaurant-id")
        if (clientRestaurantId && clientRestaurantId.trim() !== "") {
          console.log("[创建燃料订单API] getUserContext 失败，使用客户端用户认证，restaurant_id:", clientRestaurantId)
          // 客户端用户认证成功，继续处理
        } else {
          return NextResponse.json(
            {
              success: false,
              error: "未授权",
              details: "请先登录",
            },
            { status: 401 }
          )
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "权限不足",
            details: errorMessage,
          },
          { status: 403 }
        )
      }
    }

    // P0修复：强制验证 companyId（super_admin 和客户端用户除外）
    if (userContext && !userContext.companyId && userContext.role !== "super_admin") {
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
      order_number, // 自动生成的订单号
      restaurant_id,
      worker_id,
      assigned_to, // 新字段：指派配送员ID
      service_type,
      product_type, // 新字段：产品类型
      status,
      amount,
      total_amount, // 总金额（与amount一致）
      contact_name, // 联系人姓名
      contact_phone, // 联系电话
      delivery_address, // 配送地址
      notes, // 备注信息
    } = body

    // 如果是客户端用户，验证 restaurant_id 是否匹配
    if (clientRestaurantId) {
      if (!restaurant_id || restaurant_id !== clientRestaurantId) {
        console.error('[创建订单API] ❌ 客户端用户 restaurant_id 不匹配')
        return NextResponse.json(
          { 
            error: "权限不足", 
            details: "restaurant_id 不匹配"
          },
          { status: 403 }
        )
      }
    }

    // 增强参数验证和调试信息
    console.log('[创建订单API] 📥 接收到请求参数:', {
      order_number,
      restaurant_id,
      product_type,
      total_amount: total_amount || amount,
      contact_name,
      contact_phone,
      delivery_address,
      hasNotes: !!notes,
      isClientUser: !!clientRestaurantId
    })

    // 验证必要参数
    if (!restaurant_id) {
      console.error('[创建订单API] ❌ 缺少 restaurant_id')
      return NextResponse.json(
        { 
          error: "缺少必要参数：餐厅ID", 
          details: "请确保已正确获取餐厅信息后再提交"
        },
        { status: 400 }
      )
    }

    // 验证订单号
    if (!order_number) {
      console.error('[创建订单API] ❌ 缺少 order_number')
      return NextResponse.json(
        { 
          error: "缺少订单号", 
          details: "请确保订单号已正确生成"
        },
        { status: 400 }
      )
    }

    // worker_id 和 assigned_to 是可选的（客户提交时可能没有，管理员指派时才有）
    // 优先使用 assigned_to，如果没有则使用 worker_id（兼容旧字段）

    // 验证餐厅是否存在，并获取 company_id
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, company_id")
      .eq("id", restaurant_id)
      .single()

    if (restaurantError || !restaurantData) {
      return NextResponse.json(
        { error: "餐厅不存在" },
        { status: 404 }
      )
    }

    // 🔒 统一 company_id 来源：优先使用 getUserContext，其次从 restaurants 表获取
    const companyId = userContext?.companyId || restaurantData.company_id

    // ⚠️ 重要：task_pool 表的 company_id 字段有 NOT NULL 约束
    // 如果 companyId 为 null，触发器会失败，导致订单创建失败
    // 对于管理员用户，如果餐厅没有关联公司，需要先关联公司才能创建订单
    // 对于客户端用户，允许尝试创建订单，但如果触发器失败，会捕获错误并提供友好提示
    if (!companyId && userContext && userContext.role !== "super_admin") {
      return NextResponse.json(
        {
          error: "无法创建订单",
          details: "餐厅未关联公司，无法创建订单。请联系管理员为餐厅关联公司。",
          hint: "task_pool 表要求 company_id 字段不能为空",
        },
        { status: 400 }
      )
    }
    
    // 对于客户端用户（userContext 为 null），如果没有 company_id，记录警告但允许尝试创建
    // 如果 task_pool 触发器失败，会在错误处理中捕获
    if (!companyId && !userContext) {
      console.warn("[创建订单API] ⚠️ 客户端用户创建订单，但餐厅未关联公司（company_id 为 null）")
      console.warn("[创建订单API] ⚠️ 如果 task_pool 触发器失败，订单创建将失败")
    }

    // 创建配送订单（表已分离，固定为 delivery_orders）
    // 初始状态必须为 'pending'，不接受其他值
    const orderData: any = {
      restaurant_id: restaurant_id,
      company_id: companyId || null, // 添加 company_id 字段（用于多租户数据隔离和 task_pool 触发器）
      service_type: service_type || "燃料配送", // 允许自定义服务类型描述
      status: "pending", // 统一初始状态为 pending，不接受 created / new / null 等值
      amount: total_amount || amount || 0, // delivery_orders 表只有 amount 字段，没有 total_amount
      customer_confirmed: false, // 默认未确认
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 注意：order_number 字段不存在于 delivery_orders 表中
    // 订单号只存储在 order_main 表中（通过影子写入）

    // 添加备注（联系信息存储在 restaurants 表中，不需要存储在订单中）
    if (notes) {
      orderData.notes = notes
    }
    
    // 注意：contact_name、contact_phone、delivery_address 字段不存在于 delivery_orders 表中
    // 这些信息应该从 restaurants 表获取，不需要存储在订单中
    // 如果需要记录订单时的联系信息，可以考虑：
    // 1. 将这些信息存储在 notes 字段中（JSON格式）
    // 2. 或者创建单独的订单联系信息表
    // 当前实现：这些信息仅用于前端展示，不存储到数据库

    // 添加产品类型（如果提供）
    if (product_type) {
      orderData.product_type = product_type
    }

    // 添加配送员ID（优先使用 assigned_to，兼容 worker_id）
    // 注意：即使有配送员，初始状态仍为 pending，需要通过 accept 接口接单
    const deliveryWorkerId = assigned_to || worker_id
    if (deliveryWorkerId) {
      orderData.assigned_to = deliveryWorkerId
      orderData.worker_id = deliveryWorkerId // 兼容旧字段
    }

    // 插入订单并返回真实写入的 id（使用 .single() 确保只返回一条记录）
    const { data: newOrder, error: createError } = await supabase
      .from("delivery_orders")
      .insert(orderData)
      .select("id, restaurant_id, worker_id, assigned_to, product_type, service_type, status, amount, tracking_code, proof_image, customer_confirmed, created_at, updated_at")
      .single()

    if (createError) {
      console.error("[创建订单API] 创建订单失败:", createError)
      
      // 检查是否是 task_pool 触发器失败（company_id 为 null）
      const errorMessage = createError.message || ""
      const errorCode = createError.code || ""
      
      // 错误代码 23502 是 PostgreSQL NOT NULL 约束违反错误
      // 检查是否是 task_pool 表的 company_id 字段约束违反
      if (
        errorCode === "23502" && 
        (errorMessage.includes("task_pool") || errorMessage.includes("company_id"))
      ) {
        return NextResponse.json(
          {
            error: "无法创建订单",
            details: "餐厅未关联公司，无法创建订单。请联系管理员为餐厅关联公司。",
            hint: "task_pool 表要求 company_id 字段不能为空。请先为餐厅关联公司后再创建订单。",
            solution: "请联系系统管理员，为您的餐厅关联一个公司账户",
          },
          { status: 400 }
        )
      }
      
      // 也检查错误消息中是否包含 task_pool 和 company_id
      if (errorMessage.includes("task_pool") && errorMessage.includes("company_id")) {
        return NextResponse.json(
          {
            error: "无法创建订单",
            details: "餐厅未关联公司，无法创建订单。请联系管理员为餐厅关联公司。",
            hint: "task_pool 表要求 company_id 字段不能为空。请先为餐厅关联公司后再创建订单。",
            solution: "请联系系统管理员，为您的餐厅关联一个公司账户",
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        {
          error: "创建订单失败",
          details: createError.message,
        },
        { status: 500 }
      )
    }

    // 确保返回真实写入的 id（禁止返回客户端传入的伪 id）
    if (!newOrder || !newOrder.id) {
      console.error("[创建订单API] 创建成功但未返回 id")
      return NextResponse.json(
        {
          error: "创建订单失败",
          details: "订单创建成功但未返回有效的订单ID",
        },
        { status: 500 }
      )
    }

    // 📝 影子写入：同步写入 order_main 表
    let shadowWriteSuccess = false
    let shadowWriteWarning: string | null = null
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      // ⚠️ 重要：影子写入必须使用 Service Role Key，否则 RLS 策略会阻止插入
      if (!supabaseUrl || !serviceRoleKey) {
        shadowWriteWarning = "订单已创建，但无法同步到订单主表（Service Role Key 未配置）。订单可能不会在订单列表中显示。请联系管理员配置 SUPABASE_SERVICE_ROLE_KEY 环境变量。"
        console.error("[创建订单API] ⚠️ Service Role Key 未配置，无法执行影子写入")
      } else {
        const adminClient = createClient(
          supabaseUrl,
          serviceRoleKey, // 必须使用 Service Role Key，不能回退到 anonKey
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          }
        )

        // 使用传入的订单号，如果没有则生成一个
        // 注意：delivery_orders 表没有 order_number 字段，所以不能从 newOrder 中获取
        const orderNumber = order_number || `FUEL${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

        // 创建 order_main 记录
        const { data: mainOrder, error: mainOrderError } = await adminClient
          .from("order_main")
          .insert({
            order_number: orderNumber,
            order_type: "fuel",
            company_id: companyId || null,
            status: newOrder.status || "pending",
            total_amount: newOrder.amount || 0, // delivery_orders 表只有 amount 字段，order_main 表使用 total_amount
            fuel_order_id: newOrder.id,
            rental_order_id: null,
            restaurant_id: restaurant_id,
            user_id: userContext?.userId || null,
            notes: notes || null,
            created_at: newOrder.created_at || new Date().toISOString(),
          })
          .select("id")
          .single()

        if (mainOrder && mainOrder.id) {
          // 更新 delivery_orders 表的 main_order_id
          const { error: updateError } = await adminClient
            .from("delivery_orders")
            .update({ main_order_id: mainOrder.id })
            .eq("id", newOrder.id)

          if (updateError) {
            console.error("[创建订单API] 更新 delivery_orders.main_order_id 失败:", updateError)
            shadowWriteWarning = `订单已创建，但关联主表失败：${updateError.message}。订单可能不会在订单列表中显示。`
          } else {
            console.log(`[创建订单API] ✅ 影子写入成功：order_main.id = ${mainOrder.id}, delivery_orders.id = ${newOrder.id}`)
            shadowWriteSuccess = true
          }
        } else if (mainOrderError) {
          console.error("[创建订单API] 影子写入 order_main 失败:", mainOrderError)
          // 详细记录错误信息，便于排查
          console.error("[创建订单API] 错误详情:", {
            code: mainOrderError.code,
            message: mainOrderError.message,
            details: mainOrderError.details,
            hint: mainOrderError.hint,
          })
          shadowWriteWarning = `订单已创建，但同步到订单主表失败：${mainOrderError.message || "未知错误"}。订单可能不会在订单列表中显示，请联系管理员。`
        }
      }
    } catch (shadowWriteError: any) {
      console.error("[创建订单API] 影子写入异常（不影响主流程）:", shadowWriteError)
      shadowWriteWarning = `订单已创建，但同步到订单主表时发生异常：${shadowWriteError?.message || "未知错误"}。订单可能不会在订单列表中显示。`
    }

    return NextResponse.json({
      success: true,
      message: shadowWriteSuccess 
        ? "订单创建成功" 
        : "订单创建成功（但同步到订单主表失败，订单可能不会在列表中显示）",
      data: newOrder, // 包含真实写入的 id
      warning: shadowWriteWarning || undefined, // 如果影子写入失败，包含警告信息
    })
  } catch (error) {
    console.error("[创建订单API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

