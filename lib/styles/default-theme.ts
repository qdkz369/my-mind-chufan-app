/**
 * DefaultTheme 定义
 * 
 * 设计原则：
 * - 背景、卡片、分隔区必须有明确亮度层级
 * - 不使用 Apple 风格的纯白/灰阶
 * - 保留深色渐变背景
 * - 卡片允许使用轻微透明度（rgba）或 gradient
 * 
 * 亮度层级（从暗到亮）：
 * 1. 背景（最暗）- 深色渐变背景
 * 2. 卡片（稍亮）- 使用 rgba 或 gradient，保持层次感
 * 3. 分隔区（更亮）- 用于区分内容区域
 * 
 * ⚠️ 重要：
 * - 此文件定义 DefaultTheme 的完整变量配置
 * - 所有变量必须完整覆盖页面使用的 CSS 变量
 * - 仅恢复"原始 UI 的层次感"，不追求效果增强
 */

/**
 * DefaultTheme 颜色配置
 * 
 * 亮度层级说明：
 * - 背景层（最暗）：#0A1628 → #0F1B2E
 * - 卡片层（稍亮）：rgba(20, 31, 53, 0.95) 或 gradient
 * - 分隔区（更亮）：#1E293B
 */
export const DEFAULT_THEME_COLORS = {
  // 背景色（最暗层）
  background: '#0A1628', // 深色背景（非纯黑，偏蓝灰）
  backgroundSecondary: '#0F1B2E', // 次要背景（稍亮，用于渐变）
  
  // 卡片色（稍亮层）- 使用 rgba 保持层次感
  card: 'rgba(20, 31, 53, 0.95)', // 卡片背景（轻微透明度，保持层次）
  cardForeground: '#E5E8ED', // 卡片文字（高对比）
  popover: 'rgba(20, 31, 53, 0.98)', // 弹出层（更不透明）
  popoverForeground: '#E5E8ED',
  
  // 前景色（文字）
  foreground: '#E5E8ED', // 主文字（高对比）
  foregroundSecondary: '#8B94A6', // 次要文字
  
  // 主色
  primary: '#3B82F6', // 蓝色主色（高对比）
  primaryForeground: '#FFFFFF',
  
  // 次要色（分隔区层，更亮）
  secondary: '#1E293B', // 次要背景（分隔区，比卡片稍亮）
  secondaryForeground: '#E5E8ED',
  
  // 强调色
  accent: '#60A5FA', // 蓝色强调色
  accentForeground: '#FFFFFF',
  
  // 静音色
  muted: '#1E293B', // 静音背景（与分隔区同层）
  mutedForeground: '#8B94A6',
  
  // 边框（分隔区层）
  border: '#1E293B', // 边框（与分隔区同层，保持层次）
  input: '#1E293B', // 输入框背景
  ring: '#3B82F6', // 焦点环
  
  // 状态色
  destructive: '#EF4444', // 红色（高对比）
  destructiveForeground: '#FFFFFF',
  success: '#10B981', // 绿色（高对比）
  successForeground: '#FFFFFF',
  warning: '#F59E0B', // 橙色（高对比）
  warningForeground: '#FFFFFF',
  
  // 毛玻璃效果
  glass: 'rgba(20, 31, 53, 0.7)', // 毛玻璃背景
  glassBorder: 'rgba(59, 130, 246, 0.2)', // 毛玻璃边框
  
  // 图表颜色
  chart1: '#3B82F6',
  chart2: '#60A5FA',
  chart3: '#10B981',
  chart4: '#F59E0B',
  chart5: '#EF4444',
  
  // 侧边栏
  sidebar: 'rgba(20, 31, 53, 0.95)', // 侧边栏（与卡片同层）
  sidebarForeground: '#E5E8ED',
  sidebarPrimary: '#3B82F6',
  sidebarPrimaryForeground: '#FFFFFF',
  sidebarAccent: '#1E293B', // 侧边栏强调（分隔区层）
  sidebarAccentForeground: '#E5E8ED',
  sidebarBorder: '#1E293B', // 侧边栏边框（分隔区层）
  sidebarRing: '#3B82F6',
} as const

/**
 * DefaultTheme 圆角配置
 */
export const DEFAULT_THEME_BORDER_RADIUS = {
  card: '0.25rem', // 4px - 最小圆角
  button: '0.25rem',
  input: '0.25rem',
  small: '0.25rem',
  default: '0.25rem',
} as const

/**
 * DefaultTheme 阴影配置
 */
export const DEFAULT_THEME_SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
} as const

/**
 * DefaultTheme 字体配置
 */
export const DEFAULT_THEME_FONT_FAMILY = {
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace',
} as const

/**
 * DefaultTheme 完整配置
 */
export const DEFAULT_THEME = {
  name: 'default',
  displayName: 'Default',
  description: '默认主题 - 深色背景、明确亮度层级、保留层次感',
  colors: DEFAULT_THEME_COLORS,
  borderRadius: DEFAULT_THEME_BORDER_RADIUS,
  shadows: DEFAULT_THEME_SHADOWS,
  fontFamily: DEFAULT_THEME_FONT_FAMILY,
} as const
