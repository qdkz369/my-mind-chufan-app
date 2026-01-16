/**
 * 资产列表适配器
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

import { AssetFactContract } from "@/lib/facts/contracts/order.fact"

/**
 * API 响应类型（可能不完整或包含非法值）
 */
export type AssetsApiResponse = {
  success?: boolean
  assets?: unknown[] | null | undefined
  error?: string
}

/**
 * 适配后的资产事实契约（UI 可安全消费）
 */
export type AdaptedAssetFact = AssetFactContract

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
 * 适配单个资产事实
 * 
 * @param asset 原始资产数据（可能不完整或包含非法值）
 * @returns 适配后的资产事实（UI 可安全消费）
 */
function adaptSingleAsset(asset: unknown): AdaptedAssetFact | null {
  try {
    // 确保是对象
    if (!asset || typeof asset !== 'object') {
      console.warn('[AssetsAdapter] 资产数据不是对象，已过滤', {
        asset_type: typeof asset,
      })
      return null
    }
    
    const assetObj = asset as Record<string, unknown>
    
    // 验证必填字段 asset_id
    const assetId = validateString(assetObj.asset_id, '')
    if (!assetId) {
      console.warn('[AssetsAdapter] 资产缺少 asset_id，已过滤', {
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
      console.warn('[AssetsAdapter] 资产 status 值被修正', {
        asset_id: assetId,
        original: assetObj.status,
        adapted: adapted.status,
      })
    }
    if (assetObj.last_action_at !== undefined && assetObj.last_action_at !== null && assetObj.last_action_at !== adapted.last_action_at) {
      console.warn('[AssetsAdapter] 资产 last_action_at 值被修正（非法时间）', {
        asset_id: assetId,
        original: assetObj.last_action_at,
        adapted: adapted.last_action_at,
      })
    }
    
    return adapted
  } catch (error) {
    // ⚠️ 禁止 throw，所有异常只记录 console.warn（C 类）
    console.warn('[AssetsAdapter] 适配单个资产时发生异常，已过滤', {
      error: error instanceof Error ? error.message : String(error),
      asset: asset,
    })
    return null
  }
}

/**
 * 适配资产列表 API 响应
 * 
 * @param response API 响应（可能不完整或包含非法值）
 * @returns 适配后的资产列表（UI 可安全消费，始终为数组）
 */
export function adaptAssets(
  response: AssetsApiResponse
): AdaptedAssetFact[] {
  try {
    // 如果 API 返回失败，返回空数组
    if (response.success === false) {
      console.warn('[AssetsAdapter] API 返回失败，返回空数组', {
        error: response.error,
      })
      return []
    }
    
    // 确保 assets 字段存在且为数组
    if (!response.assets || !Array.isArray(response.assets)) {
      console.warn('[AssetsAdapter] assets 字段不存在或不是数组，返回空数组', {
        assets_type: typeof response.assets,
        is_array: Array.isArray(response.assets),
      })
      return []
    }
    
    // 适配每个资产，过滤掉无效的资产
    const adaptedAssets = response.assets
      .map(adaptSingleAsset)
      .filter((asset): asset is AdaptedAssetFact => asset !== null)
    
    // 如果过滤掉了部分资产，记录警告
    if (adaptedAssets.length < response.assets.length) {
      console.warn('[AssetsAdapter] 部分资产被过滤（无效数据）', {
        original_count: response.assets.length,
        adapted_count: adaptedAssets.length,
        filtered_count: response.assets.length - adaptedAssets.length,
      })
    }
    
    return adaptedAssets
  } catch (error) {
    // ⚠️ 禁止 throw，所有异常只记录 console.warn（C 类）
    console.warn('[AssetsAdapter] 适配资产列表时发生异常，返回空数组', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}
