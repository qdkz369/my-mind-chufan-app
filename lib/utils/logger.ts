/**
 * 业务警告日志工具
 *
 * 用于记录【可预期的业务失败】（B 类错误）
 * 仅使用 console.warn，不触发 Cursor 的错误监控弹窗
 * 
 * ⚠️ 重要：当 window.__ALLOW_SOFT_ERRORS__ 存在时
 * - 禁止触发 Cursor 错误弹窗
 * - 仅记录 warning
 */
export function logBusinessWarning(
  context: string,
  message: string,
  details?: unknown
) {
  // 检查是否允许软错误（不触发 Cursor 错误弹窗）
  const allowSoftErrors = typeof window !== 'undefined' && (window as any).__ALLOW_SOFT_ERRORS__ === true
  
  if (allowSoftErrors) {
    // 当标记存在时，强制使用 console.warn，不触发错误弹窗
    if (details !== undefined) {
      console.warn(`[${context}] ${message}`, details)
    } else {
      console.warn(`[${context}] ${message}`)
    }
  } else {
    // 默认行为：使用 console.warn
    if (details !== undefined) {
      console.warn(`[${context}] ${message}`, details)
    } else {
      console.warn(`[${context}] ${message}`)
    }
  }
}

/**
 * 安全错误日志工具
 * 
 * 用于记录错误，但当 window.__ALLOW_SOFT_ERRORS__ 存在时
 * 自动降级为 console.warn，不触发 Cursor 错误弹窗
 * 
 * ⚠️ 注意：此函数用于替换可能触发错误弹窗的 console.error
 */
export function logSafeError(
  context: string,
  message: string,
  details?: unknown
) {
  // 检查是否允许软错误（不触发 Cursor 错误弹窗）
  const allowSoftErrors = typeof window !== 'undefined' && (window as any).__ALLOW_SOFT_ERRORS__ === true
  
  if (allowSoftErrors) {
    // 当标记存在时，降级为 console.warn，不触发错误弹窗
    if (details !== undefined) {
      console.warn(`[${context}] ${message}`, details)
    } else {
      console.warn(`[${context}] ${message}`)
    }
  } else {
    // 默认行为：使用 console.error（可能触发错误弹窗）
    if (details !== undefined) {
      console.error(`[${context}] ${message}`, details)
    } else {
      console.error(`[${context}] ${message}`)
    }
  }
}

/**
 * 主题切换日志工具
 * 
 * 用于记录主题切换事件（必须可追踪）
 * 
 * ⚠️ 重要：
 * - 所有主题切换必须记录日志
 * - 使用 console.log 记录，包含完整的上下文信息
 */
export function logThemeChange(
  fromTheme: string,
  toTheme: string,
  reason: string,
  details?: {
    systemState?: string
    source?: string
    [key: string]: unknown
  }
) {
  const logData = {
    from: fromTheme,
    to: toTheme,
    reason,
    timestamp: new Date().toISOString(),
    ...details,
  }
  
  console.log('[Theme Change]', logData)
}
