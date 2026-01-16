/**
 * 餐厅事实总览适配器
 * 
 * 职责：
 * - 对缺失字段提供默认值
 * - 对时间字段做安全校验（非法 → null）
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

/**
 * API 响应类型（可能不完整或包含非法值）
 */
export type RestaurantOverviewApiResponse = {
  success?: boolean
  active_orders?: number | null | undefined
  completed_orders?: number | null | undefined
  active_assets?: number | null | undefined
  last_delivery_at?: string | null | undefined
  error?: string
}

/**
 * 适配后的餐厅事实总览（UI 可安全消费）
 */
export type AdaptedRestaurantOverview = {
  active_orders: number
  completed_orders: number
  active_assets: number
  last_delivery_at: string | null
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
 * 验证数字字段
 * 
 * @param value 数字值
 * @param defaultValue 默认值
 * @returns 合法的数字
 */
function validateNumber(value: unknown, defaultValue: number): number {
  if (value === null || value === undefined) {
    return defaultValue
  }
  
  if (typeof value === 'number') {
    // 检查是否为 NaN 或 Infinity
    if (isNaN(value) || !isFinite(value)) {
      return defaultValue
    }
    // 确保为非负数
    return Math.max(0, Math.floor(value))
  }
  
  // 尝试转换为数字
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue
  }
  
  return Math.max(0, Math.floor(num))
}

/**
 * 适配餐厅事实总览 API 响应
 * 
 * @param response API 响应（可能不完整或包含非法值）
 * @returns 适配后的数据（UI 可安全消费）
 */
export function adaptRestaurantOverview(
  response: RestaurantOverviewApiResponse
): AdaptedRestaurantOverview {
  try {
    // 如果 API 返回失败，返回默认值
    if (response.success === false) {
      console.warn('[RestaurantOverviewAdapter] API 返回失败，使用默认值', {
        error: response.error,
      })
      return {
        active_orders: 0,
        completed_orders: 0,
        active_assets: 0,
        last_delivery_at: null,
      }
    }
    
    // 记录非法值警告（如果存在）
    const originalActiveOrders = response.active_orders
    const originalCompletedOrders = response.completed_orders
    const originalActiveAssets = response.active_assets
    const originalLastDeliveryAt = response.last_delivery_at
    
    const adapted = {
      // 数字字段：提供默认值 0，确保始终为数字
      active_orders: validateNumber(response.active_orders, 0),
      completed_orders: validateNumber(response.completed_orders, 0),
      active_assets: validateNumber(response.active_assets, 0),
      
      // 时间字段：安全校验，非法时间 → null
      last_delivery_at: validateTimeString(response.last_delivery_at),
    }
    
    // 如果原始值与适配后的值不同，记录警告
    if (originalActiveOrders !== adapted.active_orders && originalActiveOrders !== undefined && originalActiveOrders !== null) {
      console.warn('[RestaurantOverviewAdapter] active_orders 值被修正', {
        original: originalActiveOrders,
        adapted: adapted.active_orders,
      })
    }
    if (originalCompletedOrders !== adapted.completed_orders && originalCompletedOrders !== undefined && originalCompletedOrders !== null) {
      console.warn('[RestaurantOverviewAdapter] completed_orders 值被修正', {
        original: originalCompletedOrders,
        adapted: adapted.completed_orders,
      })
    }
    if (originalActiveAssets !== adapted.active_assets && originalActiveAssets !== undefined && originalActiveAssets !== null) {
      console.warn('[RestaurantOverviewAdapter] active_assets 值被修正', {
        original: originalActiveAssets,
        adapted: adapted.active_assets,
      })
    }
    if (originalLastDeliveryAt !== adapted.last_delivery_at && originalLastDeliveryAt !== undefined && originalLastDeliveryAt !== null) {
      console.warn('[RestaurantOverviewAdapter] last_delivery_at 值被修正（非法时间）', {
        original: originalLastDeliveryAt,
        adapted: adapted.last_delivery_at,
      })
    }
    
    return adapted
  } catch (error) {
    // ⚠️ 禁止 throw，所有异常只记录 console.warn（C 类）
    console.warn('[RestaurantOverviewAdapter] 适配过程中发生异常，返回默认值', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      active_orders: 0,
      completed_orders: 0,
      active_assets: 0,
      last_delivery_at: null,
    }
  }
}
