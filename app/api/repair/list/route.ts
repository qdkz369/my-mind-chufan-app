// ACCESS_LEVEL: STAFF_LEVEL
// ALLOWED_ROLES: staff, admin, super_admin
// CURRENT_KEY: Service Role Key (优先) 或 Anon Key
// TARGET_KEY: Service Role Key (绕过 RLS) + 应用层数据隔离
// 说明：staff/admin/super_admin 可以调用，使用 service role key 绕过 RLS，数据隔离在应用层通过 company_id 实现

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyWorkerPermission } from "@/lib/auth/worker-auth"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 获取服务工单列表（维修服务、清洁服务、工程改造）
 * 支持按状态筛选，用于管理端或工人查看
 * 如果请求头中包含 x-worker-id，则用于筛选该工人的工单
 * 
 * 查询参数：
 * - status: 状态筛选（pending, processing, completed, cancelled）
 * - restaurant_id: 餐厅ID筛选（可选）
 * - service_type: 服务类型筛选（repair, cleaning, renovation, all）- 可选
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return NextResponse.json(
        { error: "数据库配置错误" },
        { status: 500 }
      )
    }

    // 使用 service role key 创建客户端（绕过 RLS）
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey || anonKey!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // 状态筛选：pending, processing, completed, cancelled
    const restaurantId = searchParams.get("restaurant_id") // 餐厅ID筛选（可选）
    const serviceTypeFilter = searchParams.get("service_type") // 服务类型筛选：repair, cleaning, renovation, all

    // 🔒 第一步：获取用户上下文，用于数据隔离
    // 调试：检查请求头中的 cookies
    const cookieHeader = request.headers.get("cookie")
    console.log("[报修列表API] 请求 Cookie header:", {
      exists: !!cookieHeader,
      length: cookieHeader?.length || 0,
      fullHeader: cookieHeader || "无", // 显示完整的 header，不截断
      hasSupabaseCookies: cookieHeader ? (cookieHeader.includes("sb-") || cookieHeader.includes("supabase")) : false
    })
    
    // 检查所有相关的 headers
    console.log("[报修列表API] 请求 Headers:", {
      cookie: cookieHeader ? "存在" : "不存在",
      authorization: request.headers.get("authorization") ? "存在" : "不存在",
      userAgent: request.headers.get("user-agent")?.substring(0, 50) || "无"
    })
    
    const userContext = await getUserContext(request)
    
    if (!userContext) {
      // 记录详细错误信息，便于调试
      console.error("[报修列表API] ❌ 获取用户上下文失败:", {
        cookieHeader: cookieHeader ? "存在" : "不存在",
        cookieHeaderLength: cookieHeader?.length || 0,
        cookieHeaderPreview: cookieHeader ? cookieHeader.substring(0, 200) : "无"
      })
      
      // 🔧 临时调试：如果无法获取用户上下文，尝试直接查询数据（仅用于调试）
      // 在生产环境中应该移除这部分代码
      if (process.env.NODE_ENV === 'development' && supabase) {
        console.warn("[报修列表API] ⚠️ 开发环境：认证失败，但尝试直接查询数据用于调试")
        
        // 直接查询所有报修工单（不进行数据隔离）
        const { data: allOrders, error: queryError } = await supabase
          .from("repair_orders")
          .select("id, restaurant_id, service_type, status, description, amount, created_at, updated_at, assigned_to, audio_url, device_id")
          .order("created_at", { ascending: false })
          .limit(500)
        
        if (queryError) {
          console.error("[报修列表API] 直接查询也失败:", queryError)
        } else {
          let repairs = allOrders || []
          // 开发环境降级路径也应用状态、餐厅、服务类型筛选，与主路径一致
          if (status) {
            repairs = repairs.filter((order: any) => {
              try {
                return order?.status === status.toLowerCase()
              } catch {
                return false
              }
            })
            console.log("[报修列表API] 开发环境-状态筛选后数量:", repairs.length)
          }
          if (restaurantId) {
            repairs = repairs.filter((order: any) => {
              try {
                return order?.restaurant_id === restaurantId
              } catch {
                return false
              }
            })
          }
          if (serviceTypeFilter && serviceTypeFilter !== "all") {
            repairs = repairs.filter((order: any) => {
              try {
                const serviceType = (order?.service_type || "").toString()
                if (serviceTypeFilter === "repair") return serviceType === "维修服务"
                if (serviceTypeFilter === "cleaning") return serviceType === "清洁服务"
                if (serviceTypeFilter === "renovation") return serviceType === "工程改造"
                return true
              } catch {
                return false
              }
            })
            console.log("[报修列表API] 开发环境-服务类型筛选后数量:", repairs.length)
          }
          repairs = repairs.map((repair: any) => ({
            ...repair,
            description: repair?.description ?? null,
            audio_url: repair?.audio_url ?? null,
            device_id: repair?.device_id ?? null,
          }))
          console.log("[报修列表API] 直接查询成功，筛选后返回 %d 条数据", repairs.length)
          return NextResponse.json({
            success: true,
            data: repairs,
            debug: {
              authError: "用户上下文为 null",
              totalOrders: (allOrders || []).length,
              filteredRepairs: repairs.length,
              note: "开发环境：认证失败但返回了数据（仅用于调试）"
            },
          })
        }
      }
      
      return NextResponse.json(
        {
          success: false,
          error: "未授权",
          details: "请先登录",
        },
        { status: 401 }
      )
    }
    
    console.log("[报修列表API] ✅ 用户上下文获取成功:", {
      role: userContext.role,
      companyId: userContext.companyId,
      userId: userContext.userId
    })

    // 🔒 第二步：数据隔离 - 如果不是超级管理员，需要获取该公司的餐厅ID列表
    let companyRestaurantIds: string[] | null = null
    if (userContext.role !== "super_admin" && userContext.companyId) {
      // 查询该公司的所有餐厅ID
      const { data: companyRestaurants, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id")
        .eq("company_id", userContext.companyId)
      
      if (restaurantError) {
        console.error("[报修列表API] 查询公司餐厅失败:", restaurantError)
        return NextResponse.json(
          {
            success: false,
            error: "查询失败",
            details: restaurantError.message,
          },
          { status: 500 }
        )
      }
      
      companyRestaurantIds = companyRestaurants?.map(r => r.id) || []
      console.log(`[报修列表API] 🔒 数据隔离：供应商账号（角色: ${userContext.role}, 公司ID: ${userContext.companyId}），只查询 ${companyRestaurantIds.length} 个餐厅的报修订单`)
      
      // 如果供应商没有餐厅，直接返回空列表
      if (companyRestaurantIds.length === 0) {
        console.log("[报修列表API] 供应商没有关联餐厅，返回空列表")
        return NextResponse.json({
          success: true,
          data: [],
          debug: {
            totalOrders: 0,
            filteredRepairs: 0,
            audioOrders: 0,
          },
        })
      }
    } else if (userContext.role !== "super_admin" && !userContext.companyId) {
      // 非超级管理员但没有 companyId，返回空列表（防止权限提升）
      console.warn("[报修列表API] ⚠️ 非超级管理员但没有 companyId，返回空列表")
      return NextResponse.json({
        success: true,
        data: [],
        debug: {
          totalOrders: 0,
          filteredRepairs: 0,
          audioOrders: 0,
        },
      })
    }

    // 构建查询 - 直接查询 repair_orders 表（已分离，无需过滤 service_type）
    let query = supabase
      .from("repair_orders")
      .select(
        "id, restaurant_id, service_type, status, description, amount, created_at, updated_at, assigned_to, audio_url, device_id"
      )
      .order("created_at", { ascending: false })
      .limit(500) // 限制查询最近500条订单
    
    // 🔒 数据隔离：如果不是超级管理员，只查询该公司的餐厅的报修订单
    if (companyRestaurantIds !== null && companyRestaurantIds.length > 0) {
      query = query.in("restaurant_id", companyRestaurantIds)
    }
    
    // 调试：记录查询条件
    console.log("[报修列表API] 开始查询", 
      status ? `status=${status}` : "", 
      restaurantId ? `restaurant_id=${restaurantId}` : "",
      companyRestaurantIds ? `company_restaurants=${companyRestaurantIds.length}` : "all_restaurants"
    )

    // 权限验证：如果请求头中包含 worker_id，验证工人权限
    const workerId = request.headers.get("x-worker-id")
    if (workerId) {
      const authResult = await verifyWorkerPermission(request, "repair")
      if (authResult instanceof NextResponse) {
        // 权限验证失败，返回错误响应
        return authResult
      }
      console.log("[报修列表API] 工人权限验证通过:", authResult.worker.name)
    }

    // 执行查询
    let { data: allOrders, error } = await query

    // 处理查询错误
    if (error) {
      console.error("[报修列表API] 查询失败:", error)
      console.error("[报修列表API] 错误详情:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        {
          error: "查询失败",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      )
    }

    // 表已分离，repair_orders 表中所有记录都是报修工单，无需过滤 service_type
    console.log("[报修列表API] 查询到的报修工单数量:", allOrders?.length || 0)
    
    let repairs = allOrders || []

    // 应用状态筛选（强化容错）
    if (status) {
      repairs = repairs.filter((order: any) => {
        try {
          return order?.status === status.toLowerCase()
        } catch {
          return false
        }
      })
      console.log("[报修列表API] 状态筛选后数量:", repairs.length)
    }

    // 应用餐厅筛选（强化容错）
    if (restaurantId) {
      repairs = repairs.filter((order: any) => {
        try {
          return order?.restaurant_id === restaurantId
        } catch {
          return false
        }
      })
      console.log("[报修列表API] 餐厅筛选后数量:", repairs.length)
    }

    // 应用服务类型筛选（表已分离，直接按 service_type 字段筛选）
    if (serviceTypeFilter && serviceTypeFilter !== "all") {
      const beforeFilterCount = repairs.length
      repairs = repairs.filter((order: any) => {
        try {
          const serviceType = (order?.service_type || "").toString()
          
          if (serviceTypeFilter === "repair") {
            return serviceType === "维修服务"
          } else if (serviceTypeFilter === "cleaning") {
            return serviceType === "清洁服务"
          } else if (serviceTypeFilter === "renovation") {
            return serviceType === "工程改造"
          }
          
          return true
        } catch {
          return false
        }
      })
      console.log("[报修列表API] 服务类型筛选后数量:", repairs.length, "(筛选前:", beforeFilterCount, ", 类型:", serviceTypeFilter, ")")
    }

    // 如果提供了workerId，根据状态筛选（强化容错）：
    // - pending 状态：显示所有 pending 且 assigned_to 为 NULL 的工单（所有工人都能看到并接单）+ 已分配给该工人的工单
    // - all 状态：显示所有 pending 且 assigned_to 为 NULL 的工单 + 分配给该工人的其他状态工单
    // - 其他状态: 只显示分配给该工人的工单
    if (workerId) {
      const beforeFilterCount = repairs.length
      if (status && status !== "all" && status !== "pending") {
        // 其他状态：只显示分配给该工人的工单（使用 assigned_to，不再使用 worker_id）
        repairs = repairs.filter((order: any) => {
          try {
            return order?.assigned_to === workerId
          } catch {
            return false
          }
        })
      } else if (status === "pending" || status === "all" || !status) {
        // pending 或 all 状态：显示所有 pending 且 assigned_to 为 NULL 的工单 + 分配给该工人的工单
        repairs = repairs.filter((order: any) => {
          try {
            // pending 状态且未分配的工单，所有工人都能看到
            if (order?.status === "pending" && (!order?.assigned_to || order?.assigned_to === null)) {
              return true
            }
            // 已分配给该工人的工单（使用 assigned_to，不再使用 worker_id）
            return order?.assigned_to === workerId
          } catch {
            return false
          }
        })
      }
      console.log("[报修列表API] 工人筛选后数量:", repairs.length, "(筛选前:", beforeFilterCount, ")")
    }

    // 确保每个订单都有 description、audio_url 和 device_id 字段（即使为空），强化容错
    repairs = repairs.map((repair: any) => {
      try {
        return {
          ...repair,
          description: repair?.description || null, // 确保 description 字段存在
          audio_url: repair?.audio_url || null, // 确保 audio_url 字段存在（语音展示必需）
          device_id: repair?.device_id || null, // 确保 device_id 字段存在（允许为 NULL）
        }
      } catch {
        // 如果映射出错，返回原始对象
        return {
          ...repair,
          description: null,
          audio_url: null,
          device_id: null,
        }
      }
    })

    // 调试：记录查询结果
    console.log("[报修列表API] 最终返回数量:", repairs.length)
    if (repairs && repairs.length > 0) {
      console.log("[报修列表API] 成功找到维修订单，第一条记录:", {
        id: repairs[0]?.id,
        service_type: repairs[0]?.service_type,
        status: repairs[0]?.status,
        has_audio: !!repairs[0]?.audio_url,
        has_description: !!repairs[0]?.description,
        assigned_to: repairs[0]?.assigned_to,
        audio_url: repairs[0]?.audio_url ? "有" : "无",
      })
      
      // 统计语音工单数量
      const audioCount = repairs.filter((r: any) => r?.audio_url && r.audio_url.trim() !== "").length
      console.log("[报修列表API] 语音工单数量:", audioCount, "/", repairs.length)
    } else {
      console.warn("[报修列表API] ⚠️ 未找到维修订单")
    }

    // 返回数据，确保包含 audio_url 字段（语音展示必需）
    const responseData = {
      success: true,
      data: repairs || [],
      debug: {
        totalOrders: allOrders?.length || 0,
        filteredRepairs: repairs.length,
        audioOrders: repairs.filter((r: any) => r?.audio_url && r.audio_url.trim() !== "").length,
      },
    }

    console.log("[报修列表API] 接口返回结果:", {
      success: responseData.success,
      dataLength: responseData.data.length,
      debug: responseData.debug,
    })

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("[报修列表API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

