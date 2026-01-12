/**
 * Capability 权限判断入口（唯一入口）
 * 阶段 2B-4：权限与审计正式收口
 * 
 * 核心原则：
 * - 所有权限判断统一走此函数
 * - 不再在 API 内直接判断 role
 * - 当前阶段：默认放行，不做硬拦截（为未来收口预留）
 */

import { supabaseServer } from '@/lib/supabase/server'
import { Capability } from '@/lib/capabilities'

/**
 * 要求特定 Capability（能力）
 * 
 * @param capability 需要的能力
 * @returns 用户信息和能力信息（如果认证）
 * 
 * @throws UNAUTHORIZED 如果用户未认证（当前阶段不会抛出，默认放行）
 */
export async function requireCapability(capability: Capability) {
  const supabase = await supabaseServer()
  
  try {
    // 尝试获取当前用户（如果已认证）
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // 当前阶段：不做硬拦截，默认放行（为未来收口预留）
    // 即使没有 user 或认证失败，也返回一个结构，允许继续执行
    // 后续可以在这里接 user_roles / role_capabilities 表进行权限校验

    if (authError || !user) {
      // 当前阶段：默认放行，返回一个模拟结构
      // 未来收口时，这里应该抛出 UNAUTHORIZED
      console.log(`[requireCapability] 未认证用户尝试使用能力: ${capability}（默认放行）`)
      return {
        user: null,
        capability,
        authorized: false, // 标记未授权，但不阻断
      }
    }

    // 已认证用户
    console.log(`[requireCapability] 用户 ${user.id} 使用能力: ${capability}`)
    return {
      user,
      capability,
      authorized: true,
    }
  } catch (error) {
    // 异常情况下也默认放行（不破坏现有功能）
    console.warn(`[requireCapability] 权限检查异常（默认放行）:`, error)
    return {
      user: null,
      capability,
      authorized: false,
    }
  }
}
