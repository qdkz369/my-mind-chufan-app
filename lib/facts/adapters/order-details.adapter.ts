/**
 * 订单详情适配器
 * 
 * 职责：
 * - 对缺失字段提供默认值
 * - 对时间字段做安全校验（非法 → null）
 * - 对数组字段保证始终为数组（空数组也可）
 * - 确保返回「UI 可安全消费的数据结构」
 * 
 * ⚠️ 重要：ViewModel 不允许再直接读取 API response
 * 所有 API response 必须先通过 Adapter 处理
 * 
 * ⚠️ 错误处理规则：
 * - 禁止 throw
 * - 禁止 console.error
 * - 所有异常只记录 console.warn（C 类）
 */

import { OrderFactContract, TraceFactContract, AssetFactContract } from "@/lib/facts/contracts/order.fact"

/**
 * API 响应类型（可能不完整或包含非法值）
 */
export type OrderDetailsApiResponse = {
  success?: boolean
  order?: unknown
  assets?: unknown[] | null | undefined
  traces?: unknown[] | null | undefined
  fact_warnings?: string[] | null | undefined
  fact_warnings_structured?: unknown[] | null | undefined
  fact_health?: unknown
  error?: string
  details?: unknown
}

/**
 * 适配后的订单详情（UI 可安全消费）
 */
export type AdaptedOrderDetails = {
  order: OrderFactContract | null
  assets: AssetFactContract[]
  traces: TraceFactContract[]
  fact_warnings: string[]
  fact_warnings_structured: unknown[]
  fact_health: unknown | null
}

/**
 * 验证时间字符串是否合法
 * 
 * @param timeStr 时间字符串
 * @returns 合法的时间字符串或 null
 */
function validateTimeString(timeStr: unknown): string | null {
  if (timeStr === null || timeStr === undefined) {
    return null
  }
  
  if (typeof timeStr !== 'string') {
    return null
  }
  
  // 检查是否为空字符串
  if (timeStr.trim() === '') {
    return null
  }
  
  // 尝试解析为 Date 对象，验证是否合法
  const date = new Date(timeStr)
  if (isNaN(date.getTime())) {
    // 非法时间字符串
    return null
  }
  
  // 返回原始字符串（如果合法）
  return timeStr
}

/**
 * 验证字符串字段
 * 
 * @param value 字符串值
 * @param defaultValue 默认值
 * @returns 合法的字符串
 */
function validateString(value: unknown, defaultValue: string): string {
  if (value === null || value === undefined) {
    return defaultValue
  }
  
  if (typeof value === 'string') {
    return value
  }
  
  // 尝试转换为字符串
  return String(value)
}

/**
 * 适配订单事实契约
 * 
 * @param order 原始订单数据（可能不完整或包含非法值）
 * @returns 适配后的订单事实契约（UI 可安全消费）或 null
 */
function adaptOrderFact(order: unknown): OrderFactContract | null {
  try {
    // 确保是对象
    if (!order || typeof order !== 'object') {
      console.warn('[OrderDetailsAdapter] 订单数据不是对象，已过滤', {
        order_type: typeof order,
      })
      return null
    }
    
    const orderObj = order as Record<string, unknown>
    
    // 验证必填字段
    const orderId = validateString(orderObj.order_id, '')
    const restaurantId = validateString(orderObj.restaurant_id, '')
    const status = validateString(orderObj.status, '')
    const createdAt = validateTimeString(orderObj.created_at)
    
    if (!orderId || !restaurantId || !status || !createdAt) {
      // 必填字段缺失，返回 null
      console.warn('[OrderDetailsAdapter] 订单缺少必填字段，已过滤', {
        order_id: orderId || null,
        restaurant_id: restaurantId || null,
        status: status || null,
        created_at: createdAt || null,
        order_keys: Object.keys(orderObj),
      })
      return null
    }
    
    const adapted = {
      order_id: orderId,
      restaurant_id: restaurantId,
      status: status,
      created_at: createdAt,
      accepted_at: validateTimeString(orderObj.accepted_at),
      completed_at: validateTimeString(orderObj.completed_at),
      worker_id: orderObj.worker_id ? validateString(orderObj.worker_id, '') : null,
    }
    
    // 如果时间字段被修正，记录警告
    if (orderObj.accepted_at !== undefined && orderObj.accepted_at !== null && orderObj.accepted_at !== adapted.accepted_at) {
      console.warn('[OrderDetailsAdapter] 订单 accepted_at 值被修正（非法时间）', {
        order_id: orderId,
        original: orderObj.accepted_at,
        adapted: adapted.accepted_at,
      })
    }
    if (orderObj.completed_at !== undefined && orderObj.completed_at !== null && orderObj.completed_at !== adapted.completed_at) {
      console.warn('[OrderDetailsAdapter] 订单 completed_at 值被修正（非法时间）', {
        order_id: orderId,
        original: orderObj.completed_at,
        adapted: adapted.completed_at,
      })
    }
    
    return adapted
  } catch (error) {
    // ⚠️ 禁止 throw，所有异常只记录 console.warn（C 类）
    console.warn('[OrderDetailsAdapter] 适配订单事实时发生异常，已过滤', {
      error: error instanceof Error ? error.message : String(error),
      order: order,
    })
    return null
  }
}

/**
 * 适配溯源事实契约
 * 
 * @param trace 原始溯源数据（可能不完整或包含非法值）
 * @returns 适配后的溯源事实契约（UI 可安全消费）或 null
 */
function adaptTraceFact(trace: unknown): TraceFactContract | null {
  try {
    // 确保是对象
    if (!trace || typeof trace !== 'object') {
      console.warn('[OrderDetailsAdapter] 溯源数据不是对象，已过滤', {
        trace_type: typeof trace,
      })
      return null
    }
    
    const traceObj = trace as Record<string, unknown>
    
    // 验证必填字段
    const id = validateString(traceObj.id, '')
    const assetId = validateString(traceObj.asset_id, '')
    const operatorId = validateString(traceObj.operator_id, '')
    const actionType = validateString(traceObj.action_type, '')
    const createdAt = validateTimeString(traceObj.created_at)
    
    if (!id || !assetId || !operatorId || !actionType || !createdAt) {
      // 必填字段缺失，返回 null
      console.warn('[OrderDetailsAdapter] 溯源记录缺少必填字段，已过滤', {
        id: id || null,
        asset_id: assetId || null,
        operator_id: operatorId || null,
        action_type: actionType || null,
        created_at: createdAt || null,
        trace_keys: Object.keys(traceObj),
      })
      return null
    }
    
    // 验证 action_type 是否为合法值
    const validActionTypes: TraceFactContract['action_type'][] = [
      'ASSET_CREATED',
      'ASSET_FILLED',
      'ASSET_DELIVERED',
      'ASSET_RETURNED',
      'ASSET_INSPECTED',
    ]
    
    if (!validActionTypes.includes(actionType as TraceFactContract['action_type'])) {
      // 非法的 action_type，返回 null
      console.warn('[OrderDetailsAdapter] 溯源记录 action_type 非法，已过滤', {
        trace_id: id,
        action_type: actionType,
        valid_types: validActionTypes,
      })
      return null
    }
    
    return {
      id: id,
      asset_id: assetId,
      operator_id: operatorId,
      action_type: actionType as TraceFactContract['action_type'],
      order_id: traceObj.order_id ? validateString(traceObj.order_id, '') : null,
      created_at: createdAt,
    }
  } catch (error) {
    // ⚠️ 禁止 throw，所有异常只记录 console.warn（C 类）
    console.warn('[OrderDetailsAdapter] 适配溯源事实时发生异常，已过滤', {
      error: error instanceof Error ? error.message : String(error),
      trace: trace,
    })
    return null
  }
}

/**
 * 适配资产事实契约
 * 
 * @param asset 原始资产数据（可能不完整或包含非法值）
 * @returns 适配后的资产事实契约（UI 可安全消费）或 null
 */
function adaptAssetFact(asset: unknown): AssetFactContract | null {
  try {
    // 确保是对象
    if (!asset || typeof asset !== 'object') {
      console.warn('[OrderDetailsAdapter] 资产数据不是对象，已过滤', {
        asset_type: typeof asset,
      })
      return null
    }
    
    const assetObj = asset as Record<string, unknown>
    
    // 验证必填字段 asset_id
    const assetId = validateString(assetObj.asset_id, '')
    if (!assetId) {
      console.warn('[OrderDetailsAdapter] 资产缺少 asset_id，已过滤', {
        asset_keys: Object.keys(assetObj),
      })
      return null
    }
    
    const adapted = {
      asset_id: assetId,
      status: validateString(assetObj.status, 'unknown'),
      last_action: validateString(assetObj.last_action, ''),
      last_action_at: validateTimeString(assetObj.last_action_at),
    }
    
    // 如果 status 或 last_action_at 被修正，记录警告
    if (assetObj.status !== undefined && assetObj.status !== null && assetObj.status !== adapted.status) {
      console.warn('[OrderDetailsAdapter] 资产 status 值被修正', {
        asset_id: assetId,
        original: assetObj.status,
        adapted: adapted.status,
      })
    }
    if (assetObj.last_action_at !== undefined && assetObj.last_action_at !== null && assetObj.last_action_at !== adapted.last_action_at) {
      console.warn('[OrderDetailsAdapter] 资产 last_action_at 值被修正（非法时间）', {
        asset_id: assetId,
        original: assetObj.last_action_at,
        adapted: adapted.last_action_at,
      })
    }
    
    return adapted
  } catch (error) {
    // ⚠️ 禁止 throw，所有异常只记录 console.warn（C 类）
    console.warn('[OrderDetailsAdapter] 适配资产事实时发生异常，已过滤', {
      error: error instanceof Error ? error.message : String(error),
      asset: asset,
    })
    return null
  }
}

/**
 * 适配订单详情 API 响应
 * 
 * @param response API 响应（可能不完整或包含非法值）
 * @returns 适配后的订单详情（UI 可安全消费）
 */
export function adaptOrderDetails(
  response: OrderDetailsApiResponse
): AdaptedOrderDetails {
  try {
    // 如果 API 返回失败，返回默认值
    if (response.success === false) {
      console.warn('[OrderDetailsAdapter] API 返回失败，使用默认值', {
        error: response.error,
        details: response.details,
      })
      return {
        order: null,
        assets: [],
        traces: [],
        fact_warnings: [],
        fact_warnings_structured: [],
        fact_health: null,
      }
    }
    
    // 适配订单事实
    const adaptedOrder = response.order ? adaptOrderFact(response.order) : null
    if (response.order && !adaptedOrder) {
      console.warn('[OrderDetailsAdapter] 订单数据无效，已过滤', {
        order_type: typeof response.order,
      })
    }
    
    // 适配资产列表（确保始终为数组）
    const originalAssetsCount = response.assets && Array.isArray(response.assets) ? response.assets.length : 0
    const adaptedAssets = response.assets && Array.isArray(response.assets)
      ? response.assets
          .map(adaptAssetFact)
          .filter((asset): asset is AssetFactContract => asset !== null)
      : []
    if (originalAssetsCount > 0 && adaptedAssets.length < originalAssetsCount) {
      console.warn('[OrderDetailsAdapter] 部分资产被过滤（无效数据）', {
        original_count: originalAssetsCount,
        adapted_count: adaptedAssets.length,
        filtered_count: originalAssetsCount - adaptedAssets.length,
      })
    }
    
    // 适配溯源列表（确保始终为数组）
    const originalTracesCount = response.traces && Array.isArray(response.traces) ? response.traces.length : 0
    const adaptedTraces = response.traces && Array.isArray(response.traces)
      ? response.traces
          .map(adaptTraceFact)
          .filter((trace): trace is TraceFactContract => trace !== null)
      : []
    if (originalTracesCount > 0 && adaptedTraces.length < originalTracesCount) {
      console.warn('[OrderDetailsAdapter] 部分溯源记录被过滤（无效数据）', {
        original_count: originalTracesCount,
        adapted_count: adaptedTraces.length,
        filtered_count: originalTracesCount - adaptedTraces.length,
      })
    }
    
    // 适配事实警告（确保始终为数组）
    const adaptedWarnings = response.fact_warnings && Array.isArray(response.fact_warnings)
      ? response.fact_warnings
          .filter((w): w is string => typeof w === 'string')
      : []
    if (response.fact_warnings && !Array.isArray(response.fact_warnings)) {
      console.warn('[OrderDetailsAdapter] fact_warnings 不是数组，已过滤', {
        fact_warnings_type: typeof response.fact_warnings,
      })
    }
    
    // 适配结构化警告（确保始终为数组）
    const adaptedStructuredWarnings = response.fact_warnings_structured && Array.isArray(response.fact_warnings_structured)
      ? response.fact_warnings_structured
      : []
    if (response.fact_warnings_structured && !Array.isArray(response.fact_warnings_structured)) {
      console.warn('[OrderDetailsAdapter] fact_warnings_structured 不是数组，已过滤', {
        fact_warnings_structured_type: typeof response.fact_warnings_structured,
      })
    }
    
    return {
      order: adaptedOrder,
      assets: adaptedAssets,
      traces: adaptedTraces,
      fact_warnings: adaptedWarnings,
      fact_warnings_structured: adaptedStructuredWarnings,
      fact_health: response.fact_health || null,
    }
  } catch (error) {
    // ⚠️ 禁止 throw，所有异常只记录 console.warn（C 类）
    console.warn('[OrderDetailsAdapter] 适配订单详情时发生异常，返回默认值', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      order: null,
      assets: [],
      traces: [],
      fact_warnings: [],
      fact_warnings_structured: [],
      fact_health: null,
    }
  }
}
