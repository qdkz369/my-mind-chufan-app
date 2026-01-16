/**
 * 主题差异工具函数
 * 
 * ⚠️ 注意：Design Baseline 系统已移除
 * 此文件保留为简化版本，仅用于兼容 theme-debug 组件
 */

/**
 * 主题差异类型（简化版）
 */
export type ThemeDiff = {
  colors?: Record<string, string>
  borderRadius?: Record<string, string>
  shadows?: Record<string, string>
  fontFamily?: Record<string, string>
}

/**
 * 计算主题差异（简化版）
 * 
 * ⚠️ 注意：由于 Design Baseline 已移除，此函数返回空差异
 * 保留此函数仅用于兼容 theme-debug 组件
 * 
 * @param themeTokens - 主题 tokens
 * @returns 空差异对象
 */
export function calculateThemeDiff(_themeTokens: unknown): ThemeDiff {
  // 返回空差异，因为 Design Baseline 已移除
  return {}
}

/**
 * 格式化差异列表为可读字符串（简化版）
 * 
 * ⚠️ 注意：由于 Design Baseline 已移除，此函数返回空数组
 * 
 * @param diff - 主题差异
 * @returns 空数组
 */
export function formatDiffList(_diff: ThemeDiff): string[] {
  // 返回空数组，因为 Design Baseline 已移除
  return []
}
