# DefaultTheme 完整定义文件

## 文件位置

DefaultTheme 的定义分布在以下文件中：

1. **TypeScript 配置对象**：`lib/styles/themes.ts` (第 469-574 行)
2. **独立 Token 定义**：`lib/styles/default-theme.ts` (完整文件)
3. **CSS 变量定义**：`app/globals.css` (第 117-212 行，`:root` 选择器)

---

## 1. TypeScript 配置对象 (`lib/styles/themes.ts`)

```typescript
/**
 * DefaultTheme 配置
 * 
 * 设计原则：
 * - 背景、卡片、分隔区必须有明确亮度层级
 * - 不使用 Apple 风格的纯白/灰阶
 * - 保留深色渐变背景
 * - 卡片允许使用轻微透明度（rgba）或 gradient
 * 
 * 亮度层级（从暗到亮）：
 * 1. 背景层（最暗）：#0A1628 → #0F1B2E
 * 2. 卡片层（稍亮）：rgba(20, 31, 53, 0.95) 或 gradient
 * 3. 分隔区（更亮）：#1E293B
 * 
 * ⚠️ 重要：
 * - DefaultTheme 不可删除、不可关闭
 * - DefaultTheme 对应 Base Theme 的视觉样式（定义在 globals.css 的 :root 中）
 * - 所有用户首次进入系统时强制使用 DefaultTheme
 * - 仅恢复"原始 UI 的层次感"，不追求效果增强
 * - 确保完整覆盖所有页面使用的 CSS 变量
 */
export const DEFAULT_THEME_CONFIG = {
  name: DEFAULT_THEME_NAME,
  displayName: 'Default',
  description: '默认主题 - 深色背景、明确亮度层级、保留层次感',
  isDefault: true,
  isUndeletable: true,
  isUnclosable: true,
  
  /**
   * DefaultTheme 完整变量配置
   * 
   * 确保完整覆盖所有页面使用的 CSS 变量：
   * - 颜色变量（背景、前景、主色、次要色、状态色等）
   * - 圆角变量
   * - 图表颜色
   * - 侧边栏颜色
   * - 毛玻璃效果
   * 
   * 注意：这些变量的实际值定义在 globals.css 的 :root 中
   * 这里仅作为配置参考和文档说明
   */
  tokens: {
    colors: {
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
    },
    borderRadius: {
      card: '0.25rem', // 4px - 最小圆角
      button: '0.25rem',
      input: '0.25rem',
      small: '0.25rem',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
    },
    fontFamily: {
      sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace',
    },
  },
} as const
```

**关键信息**：
- ✅ **使用了 `as const`**：确保类型推断为字面量类型，不可修改
- ❌ **未使用 `Object.freeze`**：仅依赖 TypeScript 的 `as const` 进行类型保护
- ❌ **未使用 `deepFreeze`**：没有深度冻结嵌套对象
- ❌ **不存在 `createTheme` / `defineTheme` 封装**：直接使用对象字面量定义

---

## 2. 独立 Token 定义 (`lib/styles/default-theme.ts`)

```typescript
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
```

**关键信息**：
- ✅ **所有导出都使用了 `as const`**：
  - `DEFAULT_THEME_COLORS` - 使用 `as const`
  - `DEFAULT_THEME_BORDER_RADIUS` - 使用 `as const`
  - `DEFAULT_THEME_SHADOWS` - 使用 `as const`
  - `DEFAULT_THEME_FONT_FAMILY` - 使用 `as const`
  - `DEFAULT_THEME` - 使用 `as const`
- ❌ **未使用 `Object.freeze`**：仅依赖 TypeScript 的 `as const`
- ❌ **未使用 `deepFreeze`**：没有深度冻结
- ❌ **不存在 `createTheme` / `defineTheme` 封装**：直接使用对象字面量

---

## 3. CSS 变量定义 (`app/globals.css`)

```css
@layer base-theme {
:root {
  /* ========================================
   * Base Theme：视觉样式 token（可被 Visual Themes 覆盖）
   * 
   * ✅ Theme 系统只控制以下视觉样式：
   * - 颜色（colors）
   * - 字体（font-family）
   * - 阴影（shadows）
   * - 圆角（border-radius）
   * ======================================== */
  
  /* DefaultTheme：默认主题（不可删除、不可关闭）
   * 
   * 设计原则：
   * - 背景、卡片、分隔区必须有明确亮度层级
   * - 不使用 Apple 风格的纯白/灰阶
   * - 保留深色渐变背景
   * - 卡片允许使用轻微透明度（rgba）或 gradient
   * 
   * 亮度层级（从暗到亮）：
   * 1. 背景层（最暗）：#0A1628 → #0F1B2E
   * 2. 卡片层（稍亮）：rgba(20, 31, 53, 0.95) 或 gradient
   * 3. 分隔区（更亮）：#1E293B
   * 
   * ⚠️ 重要：
   * - DefaultTheme 对应 Base Theme 的视觉样式
   * - 所有用户首次进入系统时强制使用 DefaultTheme
   * - DefaultTheme 不可删除、不可关闭
   * - 仅恢复"原始 UI 的层次感"，不追求效果增强
   */
  
  /* 背景色（最暗层） */
  --background: #0A1628; /* 深色背景（非纯黑，偏蓝灰） */
  --background-secondary: #0F1B2E; /* 次要背景（稍亮，用于渐变） */
  
  /* 卡片色（稍亮层）- 使用 rgba 保持层次感 */
  --card: rgba(20, 31, 53, 0.95); /* 卡片背景（轻微透明度，保持层次） */
  --card-foreground: #E5E8ED; /* 卡片文字（高对比） */
  --popover: rgba(20, 31, 53, 0.98); /* 弹出层（更不透明） */
  --popover-foreground: #E5E8ED;
  
  /* 前景色（文字） */
  --foreground: #E5E8ED; /* 主文字（高对比） */
  --foreground-secondary: #8B94A6; /* 次要文字 */
  
  /* 主色 */
  --primary: #3B82F6; /* 蓝色主色（高对比） */
  --primary-foreground: #FFFFFF;
  
  /* 次要色（分隔区层，更亮） */
  --secondary: #1E293B; /* 次要背景（分隔区，比卡片稍亮） */
  --secondary-foreground: #E5E8ED;
  
  /* 强调色 */
  --accent: #60A5FA; /* 蓝色强调色 */
  --accent-foreground: #FFFFFF;
  
  /* 静音色 */
  --muted: #1E293B; /* 静音背景（与分隔区同层） */
  --muted-foreground: #8B94A6;
  
  /* 边框（分隔区层） */
  --border: #1E293B; /* 边框（与分隔区同层，保持层次） */
  --input: #1E293B; /* 输入框背景 */
  --ring: #3B82F6; /* 焦点环 */
  
  /* 状态色 */
  --destructive: #EF4444; /* 红色（高对比） */
  --destructive-foreground: #FFFFFF;
  --success: #10B981; /* 绿色（高对比） */
  --success-foreground: #FFFFFF;
  --warning: #F59E0B; /* 橙色（高对比） */
  --warning-foreground: #FFFFFF;
  
  /* 毛玻璃效果 */
  --glass: rgba(20, 31, 53, 0.7); /* 毛玻璃背景 */
  --glass-border: rgba(59, 130, 246, 0.2); /* 毛玻璃边框 */
  
  /* 圆角规范：DefaultTheme 使用小圆角（最少装饰） */
  --radius-card: 0.25rem; /* 4px - 最小圆角，减少装饰 */
  --radius-button: 0.25rem;
  --radius-input: 0.25rem;
  --radius-small: 0.25rem;
  --radius: 0.25rem;
  
  /* 图表颜色 */
  --chart-1: #3B82F6;
  --chart-2: #60A5FA;
  --chart-3: #10B981;
  --chart-4: #F59E0B;
  --chart-5: #EF4444;
  
  /* 侧边栏（与卡片同层，保持层次感） */
  --sidebar: rgba(20, 31, 53, 0.95); /* 侧边栏（与卡片同层） */
  --sidebar-foreground: #E5E8ED;
  --sidebar-primary: #3B82F6;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #1E293B; /* 侧边栏强调（分隔区层） */
  --sidebar-accent-foreground: #E5E8ED;
  --sidebar-border: #1E293B; /* 侧边栏边框（分隔区层） */
  --sidebar-ring: #3B82F6;
  
  /* 字体族（DefaultTheme 字体配置） */
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace;
}
}
```

**关键信息**：
- ✅ **CSS 变量定义在 `:root` 选择器中**：作为全局默认值
- ✅ **使用 CSS `@layer base-theme`**：确保加载顺序和优先级
- ❌ **CSS 中无法使用 TypeScript 的 `as const`**：CSS 是声明式的，不涉及运行时类型

---

## 总结

### Token 定义完整性

**所有 Token 类别**：
1. ✅ **颜色 Token** (52 个变量)
   - 背景色：`background`, `backgroundSecondary`
   - 卡片色：`card`, `cardForeground`, `popover`, `popoverForeground`
   - 前景色：`foreground`, `foregroundSecondary`
   - 主色：`primary`, `primaryForeground`
   - 次要色：`secondary`, `secondaryForeground`
   - 强调色：`accent`, `accentForeground`
   - 静音色：`muted`, `mutedForeground`
   - 边框：`border`, `input`, `ring`
   - 状态色：`destructive`, `destructiveForeground`, `success`, `successForeground`, `warning`, `warningForeground`
   - 毛玻璃：`glass`, `glassBorder`
   - 图表颜色：`chart1`, `chart2`, `chart3`, `chart4`, `chart5`
   - 侧边栏：`sidebar`, `sidebarForeground`, `sidebarPrimary`, `sidebarPrimaryForeground`, `sidebarAccent`, `sidebarAccentForeground`, `sidebarBorder`, `sidebarRing`

2. ✅ **圆角 Token** (5 个变量)
   - `radius-card`, `radius-button`, `radius-input`, `radius-small`, `radius`

3. ✅ **阴影 Token** (4 个变量)
   - `shadows.sm`, `shadows.md`, `shadows.lg`, `shadows.xl`

4. ✅ **字体 Token** (3 个变量)
   - `font-sans`, `font-serif`, `font-mono`

**总计：64 个 CSS 变量**

### 不可变性保护

- ✅ **使用了 `as const`**：
  - `DEFAULT_THEME_CONFIG` - 使用 `as const`
  - `DEFAULT_THEME_COLORS` - 使用 `as const`
  - `DEFAULT_THEME_BORDER_RADIUS` - 使用 `as const`
  - `DEFAULT_THEME_SHADOWS` - 使用 `as const`
  - `DEFAULT_THEME_FONT_FAMILY` - 使用 `as const`
  - `DEFAULT_THEME` - 使用 `as const`

- ❌ **未使用 `Object.freeze`**：仅依赖 TypeScript 的 `as const` 进行编译时类型保护
- ❌ **未使用 `deepFreeze`**：没有运行时深度冻结保护

### 封装函数

- ❌ **不存在 `createTheme` 函数**：直接使用对象字面量定义
- ❌ **不存在 `defineTheme` 函数**：直接使用对象字面量定义
- ❌ **不存在其他封装函数**：没有工厂函数或构建器模式

### 文件结构

```
lib/styles/
├── themes.ts              # DEFAULT_THEME_CONFIG (主配置对象)
└── default-theme.ts       # DEFAULT_THEME_* (独立 Token 定义)

app/
└── globals.css            # :root { --*: ... } (CSS 变量定义)
```

### 使用方式

1. **TypeScript 代码中**：导入 `DEFAULT_THEME_CONFIG` 或 `DEFAULT_THEME_*` 常量
2. **CSS 中**：直接使用 `var(--variable-name)` 引用 CSS 变量
3. **运行时**：CSS 变量通过 `:root` 选择器自动应用到整个应用

---

## 注意事项

1. **类型安全**：`as const` 提供编译时类型保护，但运行时仍可修改（需要配合 `Object.freeze` 才能完全保护）
2. **CSS 变量优先级**：Visual Themes 通过 `[data-theme="..."]` 选择器覆盖 `:root` 中的变量
3. **默认主题不可切换**：`DEFAULT_THEME_CONFIG.isUndeletable = true` 和 `isUnclosable = true` 确保默认主题始终可用
