/**
 * Debug 环境隔离工具
 * 
 * 核心原则：
 * 1. Debug UI 仅在以下条件同时满足时渲染：
 *    - NODE_ENV === 'development'
 *    - 或 localStorage.debug === 'true'
 * 2. 生产环境强制移除 Debug 组件
 * 3. 禁止 Debug UI 使用 fixed / overlay 默认渲染
 */

/**
 * Debug UI Session 关闭状态键名
 */
const DEBUG_SESSION_CLOSED_KEY = 'debug_closed_in_session'

/**
 * 检查是否应该渲染 Debug UI
 * 
 * ⚠️ 重要：
 * - 生产环境（NODE_ENV === 'production'）始终返回 false
 * - 仅在开发环境（NODE_ENV === 'development'）或 localStorage.debug === 'true' 时返回 true
 * - 如果用户在 session 中关闭了 Debug UI，则不再显示（sessionStorage）
 * 
 * @returns 是否应该渲染 Debug UI
 */
export function shouldRenderDebug(): boolean {
  // 生产环境强制移除
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  // 仅在客户端检查 localStorage
  if (typeof window === 'undefined') {
    return false
  }

  // 检查 session 级别关闭状态
  const isClosedInSession = sessionStorage.getItem(DEBUG_SESSION_CLOSED_KEY) === 'true'
  if (isClosedInSession) {
    return false
  }

  // 开发环境或 localStorage.debug === 'true'
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isDebugEnabled = localStorage.getItem('debug') === 'true'

  return isDevelopment || isDebugEnabled
}

/**
 * 标记 Debug UI 在当前 session 中已关闭
 */
export function markDebugClosedInSession(): void {
  if (typeof window === 'undefined') {
    return
  }
  sessionStorage.setItem(DEBUG_SESSION_CLOSED_KEY, 'true')
}

/**
 * 清除 Debug UI session 关闭状态（用于重新显示）
 */
export function clearDebugSessionClosed(): void {
  if (typeof window === 'undefined') {
    return
  }
  sessionStorage.removeItem(DEBUG_SESSION_CLOSED_KEY)
}

/**
 * 获取 Debug 环境信息（用于调试）
 * 
 * @returns Debug 环境信息
 */
export function getDebugEnvInfo(): {
  nodeEnv: string
  isDevelopment: boolean
  isProduction: boolean
  localStorageDebug: string | null
  shouldRender: boolean
} {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const isDevelopment = nodeEnv === 'development'
  const isProduction = nodeEnv === 'production'
  const localStorageDebug = typeof window !== 'undefined' ? localStorage.getItem('debug') : null
  const shouldRender = shouldRenderDebug()

  return {
    nodeEnv,
    isDevelopment,
    isProduction,
    localStorageDebug,
    shouldRender,
  }
}
