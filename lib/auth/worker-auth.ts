import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

/**
 * 工人权限类型
 */
export type WorkerPermission = "delivery" | "repair" | "install"

/**
 * 工人信息接口
 */
export interface WorkerInfo {
  id: string
  name: string
  phone: string | null
  worker_types: string[]
  product_types: string[]
  status: string
}

/**
 * 从请求头或请求体中获取工人ID
 */
function getWorkerIdFromRequest(request: Request, body?: any): string | null {
  // 优先从请求头获取
  const workerIdFromHeader = request.headers.get("x-worker-id")
  if (workerIdFromHeader) {
    return workerIdFromHeader
  }

  // 从请求体获取
  if (body?.worker_id) {
    return body.worker_id
  }

  return null
}

/**
 * 验证工人权限
 * @param request - 请求对象
 * @param requiredPermission - 需要的权限类型
 * @param body - 请求体（可选，用于从中获取worker_id）
 * @returns 如果验证通过，返回工人信息；如果验证失败，返回错误响应
 */
export async function verifyWorkerPermission(
  request: Request,
  requiredPermission: WorkerPermission,
  body?: any
): Promise<{ success: true; worker: WorkerInfo } | NextResponse> {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    // 获取工人ID
    const workerId = getWorkerIdFromRequest(request, body)

    if (!workerId) {
      return NextResponse.json(
        { error: "缺少工人身份信息，请在请求头中添加 x-worker-id 或在请求体中提供 worker_id" },
        { status: 401 }
      )
    }

    // 查询工人信息
    const { data: worker, error } = await supabase
      .from("workers")
      .select("id, name, phone, worker_type, product_types, status")
      .eq("id", workerId)
      .eq("status", "active") // 只查询在职工人
      .single()

    if (error || !worker) {
      return NextResponse.json(
        { error: "工人不存在或已离职" },
        { status: 403 }
      )
    }

    // 处理worker_type（可能是单个类型、数组或JSON字符串）
    let workerTypes: string[] = []
    if (Array.isArray(worker.worker_type)) {
      // 已经是数组，但需要检查数组元素是否是JSON字符串
      for (const item of worker.worker_type) {
        if (typeof item === 'string') {
          // 检查是否是JSON字符串（如 '["delivery","repair"]'）
          if (item.startsWith('[') && item.endsWith(']')) {
            try {
              const parsed = JSON.parse(item)
              if (Array.isArray(parsed)) {
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
          workerTypes = parsed.filter((t: any) => 
            typeof t === 'string' && ['delivery', 'repair', 'install'].includes(t)
          )
        } else if (typeof parsed === 'string' && ['delivery', 'repair', 'install'].includes(parsed)) {
          workerTypes = [parsed]
        } else {
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

    // 处理product_types
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

    // 检查权限
    if (!workerTypes.includes(requiredPermission)) {
      const permissionLabels: Record<WorkerPermission, string> = {
        delivery: "配送员",
        repair: "维修工",
        install: "安装工",
      }
      return NextResponse.json(
        { 
          error: `权限不足：需要${permissionLabels[requiredPermission]}权限`,
          required: requiredPermission,
          current: workerTypes,
        },
        { status: 403 }
      )
    }

    // 返回工人信息
    return {
      success: true,
      worker: {
        id: worker.id,
        name: worker.name,
        phone: worker.phone,
        worker_types: workerTypes,
        product_types: productTypes,
        status: worker.status,
      },
    }
  } catch (error) {
    console.error("[权限验证] 验证失败:", error)
    return NextResponse.json(
      {
        error: "权限验证失败",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

