/**
 * System State Driven Theme
 * 
 * 核心原则：
 * 1. 主题切换由 systemState 驱动（禁止业务组件主动切换主题）
 * 2. 系统状态定义：normal, focus, warning, risk, success
 * 3. 主题切换必须可追踪（log）
 * 
 * ⚠️ 重要：
 * - 业务组件禁止直接调用 setTheme
 * - 所有主题切换必须通过 systemState 驱动
 * - 所有主题切换必须记录日志
 */

/**
 * System State 类型定义
 */
export type SystemState = 'normal' | 'focus' | 'warning' | 'risk' | 'success'

/**
 * System State 配置
 */
export interface SystemStateConfig {
  name: SystemState
  displayName: string
  description: string
  theme: string // 对应的主题名称
}

/**
 * System State 到 Theme 的映射
 * 
 * ⚠️ 重要：
 * - 每个 systemState 对应一个主题
 * - 主题切换由 systemState 变化驱动
 */
export const SYSTEM_STATE_THEME_MAP: Record<SystemState, string> = {
  normal: 'base', // Base Theme（默认主题）
  focus: 'base', // 暂时使用 Base Theme
  warning: 'base', // 暂时使用 Base Theme
  risk: 'base', // 暂时使用 Base Theme
  success: 'base', // 暂时使用 Base Theme
} as const

/**
 * System State 配置列表
 */
export const SYSTEM_STATE_CONFIGS: Record<SystemState, SystemStateConfig> = {
  normal: {
    name: 'normal',
    displayName: '正常',
    description: '系统正常运行状态',
    theme: SYSTEM_STATE_THEME_MAP.normal,
  },
  focus: {
    name: 'focus',
    displayName: '聚焦',
    description: '系统聚焦状态（重要操作）',
    theme: SYSTEM_STATE_THEME_MAP.focus,
  },
  warning: {
    name: 'warning',
    displayName: '警告',
    description: '系统警告状态（需要注意）',
    theme: SYSTEM_STATE_THEME_MAP.warning,
  },
  risk: {
    name: 'risk',
    displayName: '风险',
    description: '系统风险状态（需要关注）',
    theme: SYSTEM_STATE_THEME_MAP.risk,
  },
  success: {
    name: 'success',
    displayName: '成功',
    description: '系统成功状态（操作完成）',
    theme: SYSTEM_STATE_THEME_MAP.success,
  },
} as const

/**
 * 获取 System State 配置
 */
export function getSystemStateConfig(state: SystemState): SystemStateConfig {
  return SYSTEM_STATE_CONFIGS[state]
}

/**
 * 根据 System State 获取对应的主题名称
 */
export function getThemeBySystemState(state: SystemState): string {
  return SYSTEM_STATE_THEME_MAP[state]
}
