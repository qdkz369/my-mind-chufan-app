/**
 * 获取餐厅关联资产列表 API（Read-Only）
 * 
 * GET /api/facts/restaurant/:restaurant_id/assets
 * 
 * 核心原则：
 * - 只 SELECT（只读）
 * - 不写入
 * - 不推断
 * - 不修改 status
 * 
 * 返回结构：
 * {
 *   "assets": AssetFact[]
 * }
 * 
 * 逻辑说明：
 * - 从 devices 表查询该餐厅的设备（资产）
 * - 为每个设备查询最后一次操作（从 trace_logs 中获取）
 * - 返回 AssetFact[] 列表
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { AssetFact } from "@/lib/facts/types"
import { AssetFactContract } from "@/lib/facts/contracts/order.fact"
import { verifyFactAccess } from "@/lib/auth/facts-auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ restaurant_id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const { restaurant_id } = await params

    if (!restaurant_id) {
      return NextResponse.json(
        { error: "缺少必要参数: restaurant_id" },
        { status: 400 }
      )
    }

    // 权限验证：验证用户是否有权限访问指定的 restaurant_id
    const accessCheck = await verifyFactAccess(request, restaurant_id)
    if (accessCheck) {
      return accessCheck
    }

    // 1. 查询该餐厅的设备（资产）
    const { data: devicesData, error: devicesError } = await supabase
      .from("devices")
      .select("device_id, status, created_at, updated_at")
      .eq("restaurant_id", restaurant_id)

    if (devicesError) {
      console.error("[餐厅资产列表API] 查询设备失败:", devicesError)
      // 查询失败时返回空数组，不阻断流程
      return NextResponse.json({
        success: true,
        assets: [],
      })
    }

    if (!devicesData || devicesData.length === 0) {
      return NextResponse.json({
        success: true,
        assets: [],
      })
    }

    // 2. 为每个设备查询最后一次操作（从 trace_logs 中获取）
    const assetsWithTraces = await Promise.all(
      devicesData.map(async (device) => {
        // 查询该设备的最后一次操作（从 trace_logs 中）
        const { data: lastTrace, error: lastTraceError } = await supabase
          .from("trace_logs")
          .select("action_type, created_at")
          .eq("asset_id", device.device_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastTraceError || !lastTrace) {
          // 如果没有溯源记录，按照"不推断"原则
          const fallbackTime = device.updated_at || device.created_at
          
          if (!fallbackTime) {
            console.warn(`[餐厅资产列表API] 设备 ${device.device_id} 没有 updated_at 和 created_at，无法确定 last_action_at`)
          }
          
          // 映射到 AssetFactContract 类型（事实契约）
          // 注意：如果 trace_logs 无记录，last_action_at 必须为 null，不得使用 updated_at 或 created_at 伪装
          return {
            asset_id: device.device_id,
            status: device.status || "unknown",
            last_action: "", // 没有溯源记录时，last_action 为空字符串（事实不存在）
            last_action_at: null, // 如果 trace_logs 无记录，必须为 null，不得使用 updated_at 或 created_at
          } as AssetFactContract
        }

        // 映射到 AssetFactContract 类型（事实契约）
        return {
          asset_id: device.device_id,
          status: device.status || "unknown",
          last_action: lastTrace.action_type || "", // 确保是字符串类型
          last_action_at: lastTrace.created_at,
        } as AssetFactContract
      })
    )

    return NextResponse.json({
      success: true,
      assets: assetsWithTraces,
    })
  } catch (error) {
    console.error("[餐厅资产列表API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
