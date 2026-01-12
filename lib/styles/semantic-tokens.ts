/**
 * 语义化 Token 映射
 * 
 * 核心原则：
 * - 所有组件只消费语义化 token，不感知具体主题
 * - 非语义化 token（如 ios-*, dark-*, apple-*）必须映射到语义化 token
 * - Base Theme 提供完整 token 默认值
 */

/**
 * 语义化 Token 定义
 * 
 * 这些 token 是主题无关的，所有组件应该只使用这些 token
 */
export const SEMANTIC_TOKENS = {
  // 背景色
  background: 'var(--background)',
  backgroundSecondary: 'var(--background-secondary)',
  card: 'var(--card)',
  popover: 'var(--popover)',
  
  // 前景色（文字）
  foreground: 'var(--foreground)',
  foregroundSecondary: 'var(--foreground-secondary)',
  
  // 主色
  primary: 'var(--primary)',
  primaryForeground: 'var(--primary-foreground)',
  
  // 次要色
  secondary: 'var(--secondary)',
  secondaryForeground: 'var(--secondary-foreground)',
  
  // 强调色
  accent: 'var(--accent)',
  accentForeground: 'var(--accent-foreground)',
  
  // 静音色
  muted: 'var(--muted)',
  mutedForeground: 'var(--muted-foreground)',
  
  // 边框
  border: 'var(--border)',
  input: 'var(--input)',
  ring: 'var(--ring)',
  
  // 状态色
  destructive: 'var(--destructive)',
  destructiveForeground: 'var(--destructive-foreground)',
  success: 'var(--success)',
  successForeground: 'var(--success-foreground)',
  warning: 'var(--warning)',
  warningForeground: 'var(--warning-foreground)',
  
  // 圆角
  radiusCard: 'var(--radius-card)',
  radiusButton: 'var(--radius-button)',
  radiusInput: 'var(--radius-input)',
  radiusSmall: 'var(--radius-small)',
  
  // 毛玻璃效果
  glass: 'var(--glass)',
  glassBorder: 'var(--glass-border)',
} as const

/**
 * 非语义化 Token 到语义化 Token 的映射
 * 
 * 这些映射用于将旧的非语义化 token 转换为语义化 token
 */
export const TOKEN_MAPPING = {
  // iOS 特定 token → 语义化 token
  'ios-button': 'button', // 移除，使用语义化类名
  'ios-interactive': 'interactive', // 移除，使用语义化类名
  
  // Dark mode token → 语义化 token（通过 data-theme 选择器处理）
  'dark:bg-input/30': '[data-theme="apple-white"]:bg-input/30',
  'dark:border-input': '[data-theme="apple-white"]:border-input',
  'dark:hover:bg-input/50': '[data-theme="apple-white"]:hover:bg-input/50',
  'dark:hover:bg-accent/50': '[data-theme="apple-white"]:hover:bg-accent/50',
  'dark:aria-invalid:ring-destructive/40': '[data-theme="apple-white"]:aria-invalid:ring-destructive/40',
  'dark:focus-visible:ring-destructive/40': '[data-theme="apple-white"]:focus-visible:ring-destructive/40',
  'dark:bg-destructive/60': '[data-theme="apple-white"]:bg-destructive/60',
  'dark:data-[state=checked]:bg-primary': '[data-theme="apple-white"]:data-[state=checked]:bg-primary',
  'dark:text-foreground': '[data-theme="apple-white"]:text-foreground',
  'dark:text-muted-foreground': '[data-theme="apple-white"]:text-muted-foreground',
  'dark:data-[state=unchecked]:bg-input/80': '[data-theme="apple-white"]:data-[state=unchecked]:bg-input/80',
  'dark:data-[state=unchecked]:bg-foreground': '[data-theme="apple-white"]:data-[state=unchecked]:bg-foreground',
  'dark:data-[state=checked]:bg-primary-foreground': '[data-theme="apple-white"]:data-[state=checked]:bg-primary-foreground',
  'dark:data-[state=active]:border-input': '[data-theme="apple-white"]:data-[state=active]:border-input',
  'dark:data-[state=active]:bg-input/30': '[data-theme="apple-white"]:data-[state=active]:bg-input/30',
  'dark:has-data-[state=checked]:bg-primary/10': '[data-theme="apple-white"]:has-data-[state=checked]:bg-primary/10',
  'dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40': '[data-theme="apple-white"]:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',
  'dark:bg-transparent': '[data-theme="apple-white"]:bg-transparent',
  'dark:[[data-slot=tooltip-content]_&]:bg-background/10': '[data-theme="apple-white"]:[[data-slot=tooltip-content]_&]:bg-background/10',
  'dark:data-[variant=destructive]:focus:bg-destructive/20': '[data-theme="apple-white"]:data-[variant=destructive]:focus:bg-destructive/20',
  'dark:hover:text-accent-foreground': '[data-theme="apple-white"]:hover:text-accent-foreground',
} as const

/**
 * 获取语义化 token 的 CSS 变量名
 */
export function getSemanticToken(token: keyof typeof SEMANTIC_TOKENS): string {
  return SEMANTIC_TOKENS[token]
}
