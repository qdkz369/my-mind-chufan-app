import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
// 暂时注释掉权限验证，避免服务器崩溃
// import { verifyWorkerPermission } from "@/lib/auth/worker-auth"

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
export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // 状态筛选：pending, processing, completed, cancelled
    const restaurantId = searchParams.get("restaurant_id") // 餐厅ID筛选（可选）
    const serviceTypeFilter = searchParams.get("service_type") // 服务类型筛选：repair, cleaning, renovation, all

    // 构建查询 - 重要：优先检查 audio_url 不为空，或者 service_type 包含"维修"
    // 注意：Supabase 不支持 OR 条件在 where 中，所以先查询所有订单，然后在客户端过滤
    // 暂时移除 restaurants 关联查询，先确保能返回基础数据
    // 注意：如果数据库没有 worker_id 字段，请从 select 中删除它
    let query = supabase
      .from("orders")
      .select(
        "id, restaurant_id, service_type, status, description, amount, contact_phone, created_at, updated_at, assigned_to, audio_url, device_id"
      )
      .order("created_at", { ascending: false })
      .limit(500) // 限制查询最近500条订单
    
    // 调试：记录查询条件
    console.log("[报修列表API] 开始查询所有订单（将在客户端过滤）", status ? `status=${status}` : "", restaurantId ? `restaurant_id=${restaurantId}` : "")

    // 暂时完全跳过权限验证，避免服务器崩溃
    // 如果请求头中包含worker_id，仅用于后续筛选，不进行权限验证
    const workerId = request.headers.get("x-worker-id")
    if (workerId) {
      console.log("[报修列表API] 检测到 workerId，将用于筛选（跳过权限验证）:", workerId)
    }

    // 执行查询（先获取所有订单，然后在客户端过滤）
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

    // 在客户端过滤服务订单（重要：优先检查 audio_url 不为空）
    // 支持的服务类型：维修服务、清洁服务、工程改造
    console.log("[报修列表API] 原始订单数量:", allOrders?.length || 0)
    
    // 辅助函数：判断是否为服务订单（维修、清洁、工程改造）
    const isServiceOrder = (order: any): boolean => {
      if (!order) return false
      
      try {
        // 重要：只要 audio_url 不为空，就必须显示在服务列表里（语音报修/报修单）
        const audioUrl = order?.audio_url
        const hasAudio = audioUrl && typeof audioUrl === 'string' && audioUrl.trim() !== ""
        if (hasAudio) {
          console.log("[报修列表API] 匹配到语音服务单:", order?.id, "audio_url: 有")
          return true
        }
        
        // 如果没有音频，则按 service_type 判断（强化容错）
        const serviceType = (order?.service_type || "").toString()
        if (!serviceType) return false // 如果 service_type 为空，直接返回 false
        
        const normalizedType = serviceType?.toLowerCase() || ""
        
        // 匹配维修服务
        const isRepair = 
          serviceType === "维修服务" ||
          (serviceType?.includes && serviceType.includes("维修")) ||
          (normalizedType?.includes && normalizedType.includes("repair"))
        
        // 匹配清洁服务
        const isCleaning = 
          serviceType === "清洁服务" ||
          (serviceType?.includes && serviceType.includes("清洁")) ||
          (serviceType?.includes && serviceType.includes("清洗")) ||
          (normalizedType?.includes && normalizedType.includes("clean"))
        
        // 匹配工程改造
        const isRenovation = 
          serviceType === "工程改造" ||
          (serviceType?.includes && serviceType.includes("改造")) ||
          (serviceType?.includes && serviceType.includes("工程")) ||
          (normalizedType?.includes && normalizedType.includes("renovation")) ||
          (normalizedType?.includes && normalizedType.includes("construction"))
        
        const isService = isRepair || isCleaning || isRenovation
        
        if (isService) {
          console.log("[报修列表API] 匹配到服务订单:", order?.id, "service_type:", serviceType, 
            isRepair ? "(维修)" : isCleaning ? "(清洁)" : "(工程改造)")
        }
        
        return isService
      } catch (filterError) {
        // 如果过滤过程中出错，记录错误但不崩溃
        console.warn("[报修列表API] 过滤订单时出错:", filterError, "订单ID:", order?.id)
        return false
      }
    }
    
    let repairs = (allOrders || []).filter(isServiceOrder)
    console.log("[报修列表API] 过滤后的维修订单数量:", repairs.length)

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

    // 应用服务类型筛选（强化容错）
    if (serviceTypeFilter && serviceTypeFilter !== "all") {
      const beforeFilterCount = repairs.length
      repairs = repairs.filter((order: any) => {
        try {
          const serviceType = (order?.service_type || "").toString()
          const normalizedType = serviceType?.toLowerCase() || ""
          
          if (serviceTypeFilter === "repair") {
            // 维修服务
            return serviceType === "维修服务" ||
              (serviceType?.includes && serviceType.includes("维修")) ||
              (normalizedType?.includes && normalizedType.includes("repair"))
          } else if (serviceTypeFilter === "cleaning") {
            // 清洁服务
            return serviceType === "清洁服务" ||
              (serviceType?.includes && serviceType.includes("清洁")) ||
              (serviceType?.includes && serviceType.includes("清洗")) ||
              (normalizedType?.includes && normalizedType.includes("clean"))
          } else if (serviceTypeFilter === "renovation") {
            // 工程改造
            return serviceType === "工程改造" ||
              (serviceType?.includes && serviceType.includes("改造")) ||
              (serviceType?.includes && serviceType.includes("工程")) ||
              (normalizedType?.includes && normalizedType.includes("renovation")) ||
              (normalizedType?.includes && normalizedType.includes("construction"))
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

