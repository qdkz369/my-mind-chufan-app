/**
 * 金融视图访问权限规则
 * 
 * ========================================
 * 权限规则
 * ========================================
 * 
 * 1. 默认角色不可见：
 *    - 普通用户（restaurant / client）
 *    - 工人端（worker / staff）
 * 
 * 2. 可见角色：
 *    - 管理端（admin / super_admin）
 *    - 平台运营角色（finance 权限）
 * 
 * ========================================
 * 核心原则
 * ========================================
 * 
 * - 工人永远看不到金额
 * - 事实页面不会"闪一下钱"
 * - 权限不足时不渲染、不请求 API
 */

import { UserRole } from "@/lib/auth/user-context"

/**
 * 检查用户是否有权限查看金融视图
 * 
 * @param role 用户角色
 * @returns 是否有权限查看金融视图
 */
export function canViewFinancialView(role: UserRole | string | null | undefined): boolean {
  if (!role) {
    return false
  }

  // 管理端角色：可见
  if (role === "super_admin" || role === "platform_admin") {
    return true
  }

  // 平台运营角色：可见（如果有 finance 权限）
  // 注意：当前阶段暂不支持 finance 权限，未来可以扩展
  // if (hasFinanceCapability(role)) {
  //   return true
  // }

  // 默认角色：不可见
  // - staff（工人端）
  // - factory（工厂）
  // - filler（充装工）
  // - restaurant（餐厅/商户）
  // - client（客户端用户）
  // - worker（工人）
  return false
}

/**
 * 检查客户端用户是否有权限查看金融视图
 * 
 * 客户端用户（通过 restaurantId 登录）默认不可见金融视图
 * 
 * @param isAdmin 是否是管理员
 * @returns 是否有权限查看金融视图
 */
export function canViewFinancialViewClient(isAdmin: boolean): boolean {
  // 客户端用户默认不可见
  // 只有管理员可见
  return isAdmin
}

/**
 * 检查是否是工人端用户
 * 
 * @param role 用户角色
 * @returns 是否是工人端用户
 */
export function isWorkerRole(role: UserRole | string | null | undefined): boolean {
  if (!role) {
    return false
  }

  // 工人端角色
  return role === "staff" || role === "factory" || role === "filler" || role === "worker"
}

/**
 * 检查是否是普通用户（非管理员）
 * 
 * @param role 用户角色
 * @returns 是否是普通用户
 */
export function isRegularUser(role: UserRole | string | null | undefined): boolean {
  if (!role) {
    return true // 未登录视为普通用户
  }

  // 非管理员角色视为普通用户
  return role !== "super_admin" && role !== "platform_admin"
}
