/**
 * UI Semantic Layer（语义层）
 * 
 * 核心原则：
 * - 所有 Card / Section / Panel 组件必须声明 semanticLevel
 * - 禁止组件通过颜色自行表达重要性
 * - 语义层级决定视觉样式（颜色、对比度、边框等）
 * 
 * 语义层级定义：
 * - primary_fact: 主要事实信息（最重要的数据）
 * - secondary_fact: 次要事实信息
 * - action: 操作相关（按钮、表单等）
 * - financial: 金融相关信息（金额、支付等）
 * - system_hint: 系统提示（帮助、提示等）
 */

/**
 * UI 语义层级枚举
 */
export type SemanticLevel =
  | 'primary_fact'
  | 'secondary_fact'
  | 'action'
  | 'financial'
  | 'system_hint'

/**
 * 语义层级配置
 */
export interface SemanticLevelConfig {
  /**
   * 层级名称
   */
  name: SemanticLevel
  
  /**
   * 显示名称
   */
  displayName: string
  
  /**
   * 描述
   */
  description: string
  
  /**
   * 重要性权重（1-5，5 最重要）
   */
  importance: 1 | 2 | 3 | 4 | 5
}

/**
 * 语义层级配置映射
 */
export const SEMANTIC_LEVELS: Record<SemanticLevel, SemanticLevelConfig> = {
  primary_fact: {
    name: 'primary_fact',
    displayName: '主要事实',
    description: '最重要的数据信息，需要高对比度和强调',
    importance: 5,
  },
  secondary_fact: {
    name: 'secondary_fact',
    displayName: '次要事实',
    description: '次要的数据信息，对比度适中',
    importance: 3,
  },
  action: {
    name: 'action',
    displayName: '操作',
    description: '操作相关的内容（按钮、表单等），需要明确的可交互性',
    importance: 4,
  },
  financial: {
    name: 'financial',
    displayName: '金融信息',
    description: '金融相关信息（金额、支付等），需要明确的责任标识',
    importance: 4,
  },
  system_hint: {
    name: 'system_hint',
    displayName: '系统提示',
    description: '系统提示、帮助信息等，视觉上弱化',
    importance: 2,
  },
} as const

/**
 * 获取语义层级配置
 */
export function getSemanticLevelConfig(level: SemanticLevel): SemanticLevelConfig {
  return SEMANTIC_LEVELS[level]
}

/**
 * 语义层级重要性排序（从高到低）
 */
export const SEMANTIC_LEVEL_ORDER: SemanticLevel[] = [
  'primary_fact',
  'action',
  'financial',
  'secondary_fact',
  'system_hint',
] as const
