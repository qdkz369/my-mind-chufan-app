// ACCESS_LEVEL: PUBLIC (公开API)
// ALLOWED_ROLES: 无（公开访问）
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：公开API，用于工人登录，无需权限验证

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

/**
 * POST: 工人登录
 * 根据工人ID或电话登录，返回工人信息和权限
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
    const { worker_id, phone } = body

    if (!worker_id && !phone) {
      return NextResponse.json(
        { error: "请提供工人ID或电话号码" },
        { status: 400 }
      )
    }

    // 构建查询
    let query = supabase
      .from("workers")
      .select("id, name, phone, worker_type, product_types, status, created_at, updated_at")
      .eq("status", "active") // 只查询在职工人

    if (worker_id) {
      query = query.eq("id", worker_id)
    } else if (phone) {
      query = query.eq("phone", phone)
    }

    const { data: worker, error } = await query.single()

    if (error || !worker) {
      return NextResponse.json(
        { error: "工人不存在或已离职" },
        { status: 404 }
      )
    }

    // 处理product_types（可能是JSON字符串或数组）
    let productTypes: string[] = []
    if (typeof worker.product_types === 'string') {
      try {
        productTypes = JSON.parse(worker.product_types || '[]')
      } catch (e) {
        productTypes = []
      }
    } else if (Array.isArray(worker.product_types)) {
      productTypes = worker.product_types
    }

    // 处理worker_type（可能是单个类型、数组或JSON字符串，支持多类型）
    let workerTypes: string[] = []
    
    console.log("[工人登录API] 原始worker_type:", worker.worker_type, "类型:", typeof worker.worker_type, "是否为数组:", Array.isArray(worker.worker_type))
    
    if (Array.isArray(worker.worker_type)) {
      // 已经是数组，但需要检查数组元素是否是JSON字符串
      workerTypes = []
      for (const item of worker.worker_type) {
        if (typeof item === 'string') {
          // 检查是否是JSON字符串（如 '["delivery","repair"]'）
          if (item.startsWith('[') && item.endsWith(']')) {
            try {
              const parsed = JSON.parse(item)
              if (Array.isArray(parsed)) {
                // 解析成功，添加所有有效类型
                parsed.forEach((t: any) => {
                  if (typeof t === 'string' && ['delivery', 'repair', 'install'].includes(t) && !workerTypes.includes(t)) {
                    workerTypes.push(t)
                  }
                })
              }
            } catch (e) {
              // 解析失败，检查是否是有效类型
              if (['delivery', 'repair', 'install'].includes(item) && !workerTypes.includes(item)) {
                workerTypes.push(item)
              }
            }
          } else {
            // 普通字符串，检查是否是有效类型
            if (['delivery', 'repair', 'install'].includes(item) && !workerTypes.includes(item)) {
              workerTypes.push(item)
            }
          }
        }
      }
    } else if (typeof worker.worker_type === 'string') {
      // 可能是JSON字符串或单个类型字符串
      try {
        const parsed = JSON.parse(worker.worker_type)
        if (Array.isArray(parsed)) {
          // 解析为数组
          workerTypes = parsed.filter((t: any) => 
            typeof t === 'string' && ['delivery', 'repair', 'install'].includes(t)
          )
        } else if (typeof parsed === 'string' && ['delivery', 'repair', 'install'].includes(parsed)) {
          // 解析后是单个有效类型
          workerTypes = [parsed]
        } else {
          // 解析后不是有效类型，检查原字符串
          if (['delivery', 'repair', 'install'].includes(worker.worker_type)) {
            workerTypes = [worker.worker_type]
          }
        }
      } catch (e) {
        // 不是JSON，检查是否是有效的单个类型
        if (['delivery', 'repair', 'install'].includes(worker.worker_type)) {
          workerTypes = [worker.worker_type]
        }
      }
    }

    console.log("[工人登录API] 处理后的workerTypes:", workerTypes, "长度:", workerTypes.length)

    return NextResponse.json({
      success: true,
      message: "登录成功",
      data: {
        id: worker.id,
        name: worker.name,
        phone: worker.phone,
        worker_types: workerTypes, // 返回数组，支持多类型
        product_types: productTypes,
        status: worker.status,
      },
    })
  } catch (error) {
    console.error("[工人登录API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

