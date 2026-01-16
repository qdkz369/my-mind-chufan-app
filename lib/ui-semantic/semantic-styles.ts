/**
 * UI Semantic Layer 样式映射
 * 
 * 核心原则：
 * - 通过 data-semantic-level 属性控制样式
 * - 禁止组件直接使用颜色表达重要性
 * - 语义层级决定视觉样式（颜色、对比度、边框等）
 * - 语义层级决定字号区间、行高、信息密度、是否允许动画
 */

import { SemanticLevel } from './semantic-levels'

/**
 * 字号区间配置
 */
export interface FontSizeRange {
  /**
   * 最小字号（CSS 变量名）
   */
  min: string
  
  /**
   * 默认字号（CSS 变量名）
   */
  default: string
  
  /**
   * 最大字号（CSS 变量名）
   */
  max: string
}

/**
 * 语义层级样式配置
 */
export interface SemanticStyleConfig {
  /**
   * CSS 变量前缀（用于背景、文字等）
   */
  backgroundVar?: string
  foregroundVar?: string
  borderVar?: string
  
  /**
   * 对比度级别（1-5，5 最高对比）
   */
  contrast: 1 | 2 | 3 | 4 | 5
  
  /**
   * 是否使用强调边框
   */
  emphasizedBorder?: boolean
  
  /**
   * 字号区间
   */
  fontSizeRange: FontSizeRange
  
  /**
   * 行高（CSS 变量名）
   */
  lineHeight: string
  
  /**
   * 信息密度（1-5，5 最密集）
   */
  density: 1 | 2 | 3 | 4 | 5
  
  /**
   * 是否允许动画
   */
  allowAnimation: boolean
}

/**
 * 语义层级样式映射
 */
export const SEMANTIC_STYLE_MAP: Record<SemanticLevel, SemanticStyleConfig> = {
  primary_fact: {
    backgroundVar: '--card',
    foregroundVar: '--foreground',
    borderVar: '--primary',
    contrast: 5,
    emphasizedBorder: true,
    fontSizeRange: {
      min: '--font-size-lg',
      default: '--font-size-xl',
      max: '--font-size-2xl',
    },
    lineHeight: '--line-height-tight',
    density: 3,
    allowAnimation: false,
  },
  secondary_fact: {
    backgroundVar: '--card',
    foregroundVar: '--foreground-secondary',
    borderVar: '--border',
    contrast: 3,
    emphasizedBorder: false,
    fontSizeRange: {
      min: '--font-size-sm',
      default: '--font-size-base',
      max: '--font-size-lg',
    },
    lineHeight: '--line-height-normal',
    density: 2,
    allowAnimation: false,
  },
  action: {
    backgroundVar: '--primary',
    foregroundVar: '--primary-foreground',
    borderVar: '--primary',
    contrast: 5,
    emphasizedBorder: false,
    fontSizeRange: {
      min: '--font-size-base',
      default: '--font-size-lg',
      max: '--font-size-xl',
    },
    lineHeight: '--line-height-normal',
    density: 4,
    allowAnimation: true,
  },
  financial: {
    backgroundVar: '--muted',
    foregroundVar: '--foreground',
    borderVar: '--border',
    contrast: 4,
    emphasizedBorder: true,
    fontSizeRange: {
      min: '--font-size-sm',
      default: '--font-size-base',
      max: '--font-size-lg',
    },
    lineHeight: '--line-height-tight',
    density: 5,
    allowAnimation: false,
  },
  system_hint: {
    backgroundVar: '--muted',
    foregroundVar: '--muted-foreground',
    borderVar: '--border',
    contrast: 2,
    emphasizedBorder: false,
    fontSizeRange: {
      min: '--font-size-xs',
      default: '--font-size-sm',
      max: '--font-size-base',
    },
    lineHeight: '--line-height-relaxed',
    density: 1,
    allowAnimation: false,
  },
} as const

/**
 * 获取语义层级样式配置
 */
export function getSemanticStyleConfig(level: SemanticLevel): SemanticStyleConfig {
  return SEMANTIC_STYLE_MAP[level]
}

/**
 * 获取语义层级的 CSS 类名
 * 
 * TEMPORARILY_DISABLED: 语义样式规范和约束已暂时停用
 */
export function getSemanticLevelClassName(level: SemanticLevel | null | undefined): string {
  // 暂时停用：返回空字符串，不应用任何语义样式类名
  return ''
  
  /* 原实现已注释，等需要时再恢复
  // 防御性处理：如果 level 为 undefined 或 null，返回默认值
  if (!level) {
    // 只在客户端开发环境且首次出现时警告，避免控制台刷屏
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const warningKey = '__semantic_level_warning_shown__'
      if (!(window as any)[warningKey]) {
        console.warn(
          '[getSemanticLevelClassName] 检测到 Card 组件缺少 semanticLevel 属性。',
          '请为所有 Card 组件添加 semanticLevel 属性（如：semanticLevel="primary_fact"）。',
          '当前使用默认值 "primary_fact"。'
        )
        ;(window as any)[warningKey] = true
      }
    }
    return 'semantic-primary-fact'
  }
  return `semantic-${level.replace(/_/g, '-')}`
  */
}
