/**
 * View Perspective（视图视角）
 * 
 * 核心原则：
 * - Facts Adapter 输出的是"中性事实"（不包含 perspective 相关的内容）
 * - ViewModel 根据 perspective 决定：
 *   - 展示字段
 *   - 文案语气
 *   - 是否显示系统字段（如 ID / 状态码）
 * 
 * 视图视角定义：
 * - user: 用户视角（餐厅/商户）
 * - admin: 管理员视角
 * - worker: 工人视角
 * - supplier: 供应商视角
 */

/**
 * View Perspective 类型
 */
export type ViewPerspective = 'user' | 'admin' | 'worker' | 'supplier'

/**
 * View Perspective 配置
 */
export interface ViewPerspectiveConfig {
  /**
   * 视角名称
   */
  name: ViewPerspective
  
  /**
   * 显示名称
   */
  displayName: string
  
  /**
   * 描述
   */
  description: string
  
  /**
   * 是否显示系统字段（如 ID、状态码等）
   */
  showSystemFields: boolean
  
  /**
   * 文案语气
   * - friendly: 友好（用户视角）
   * - professional: 专业（管理员视角）
   * - operational: 操作（工人视角）
   * - business: 商务（供应商视角）
   */
  tone: 'friendly' | 'professional' | 'operational' | 'business'
}

/**
 * View Perspective 配置映射
 */
export const VIEW_PERSPECTIVES: Record<ViewPerspective, ViewPerspectiveConfig> = {
  user: {
    name: 'user',
    displayName: '用户',
    description: '用户视角（餐厅/商户）',
    showSystemFields: false,
    tone: 'friendly',
  },
  admin: {
    name: 'admin',
    displayName: '管理员',
    description: '管理员视角',
    showSystemFields: true,
    tone: 'professional',
  },
  worker: {
    name: 'worker',
    displayName: '工人',
    description: '工人视角',
    showSystemFields: false,
    tone: 'operational',
  },
  supplier: {
    name: 'supplier',
    displayName: '供应商',
    description: '供应商视角',
    showSystemFields: false,
    tone: 'business',
  },
} as const

/**
 * 获取 View Perspective 配置
 */
export function getViewPerspectiveConfig(perspective: ViewPerspective): ViewPerspectiveConfig {
  return VIEW_PERSPECTIVES[perspective]
}

/**
 * 文案语气映射
 */
export type ToneMapping<T> = {
  friendly: T
  professional: T
  operational: T
  business: T
}

/**
 * 根据 perspective 获取文案
 */
export function getTextByPerspective<T>(
  perspective: ViewPerspective,
  mapping: ToneMapping<T>
): T {
  const config = getViewPerspectiveConfig(perspective)
  return mapping[config.tone]
}
