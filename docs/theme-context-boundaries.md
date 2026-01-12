# Theme Context 职责边界文档

## 完成时间
2025-01-20

## 核心原则

### ✅ Theme Context 的职责（严格限制）

Theme Context (`lib/styles/theme-context.tsx`) **只能**负责：

1. **注入 CSS variables**
   - 通过 `document.documentElement.setAttribute('style', cssVars)` 注入 Visual Theme 的 CSS 变量
   - 不包含 spacing、layout 等结构相关的变量
   - 只包含颜色、圆角、阴影、字体等视觉相关的变量

2. **管理当前 visual theme key**
   - 通过 `document.documentElement.setAttribute('data-theme', themeName)` 设置主题标识
   - 通过 `localStorage` 持久化 Visual Theme 选择（键名：`ios-theme-preference`）
   - 提供 `useTheme()` Hook 供组件读取当前主题

### ⛔ Theme Context 的禁止事项

Theme Context **禁止**：

1. **控制组件显示/隐藏**
   - ❌ 不包含任何条件渲染逻辑（如 `{mounted && children}`）
   - ❌ 不包含任何 `display: none` 或 `visibility: hidden` 相关的 CSS
   - ❌ 不控制组件的可见性状态

2. **控制布局或业务逻辑**
   - ❌ 不包含任何布局相关的 CSS（如 `position`、`z-index`、`flex`、`grid`）
   - ❌ 不包含任何业务状态管理
   - ❌ 不包含任何业务逻辑判断

3. **控制组件状态**
   - ❌ 不管理任何业务组件的状态
   - ❌ 不控制任何业务流程

## Base Theme 与 Visual Theme 的关系

### Base Theme（基础主题）

**加载方式**：
- Base Theme 通过 `app/globals.css` 的 `:root` 选择器自动加载
- **不受 ThemeProvider 控制**
- **永远先加载**（在 Visual Theme 之前）

**特点**：
- 包含所有结构相关的 token（spacing、layout、fontSize、lineHeight、zIndex）
- 包含所有视觉相关的 token 的默认值（颜色、圆角、阴影、字体）
- 不允许被切换、不参与主题选择、不保存到 localStorage
- 当没有 Visual Theme 时，完全使用 Base Theme

### Visual Theme（视觉主题）

**加载方式**：
- Visual Theme 作为**覆盖层**叠加在 Base Theme 之上
- 通过 `data-theme` 属性和内联 `style` 属性应用
- **由 ThemeProvider 控制**

**特点**：
- 只能覆盖视觉相关的 token（颜色、圆角、阴影、字体）
- 严禁修改结构相关的 token（spacing、layout、组件结构）
- 可以动态切换和保存到 localStorage
- 当应用 Visual Theme 时：
  1. Base Theme 的 CSS 变量（来自 `:root`）仍然存在
  2. Visual Theme 的 CSS 变量（通过内联 `style`）覆盖对应的变量

## 实现细节

### 初始化流程

```typescript
// 步骤 1：确保 Base Theme 先加载（通过 globals.css 的 :root）
// Base Theme 不需要任何操作，它已经通过 globals.css 的 :root 自动应用
root.removeAttribute('data-theme')
root.removeAttribute('style')

// 步骤 2：检查是否有可切换的 Visual Theme 需要叠加
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
if (savedTheme && isValidVisualTheme(savedTheme)) {
  // Visual Theme 作为覆盖层叠加在 Base Theme 之上
  root.setAttribute('data-theme', savedTheme)
  root.setAttribute('style', visualCssVars)
}
```

### 切换主题流程

```typescript
// Base Theme → Visual Theme
if (theme === BASE_THEME_NAME) {
  // 移除 Visual Theme 覆盖层，回到 Base Theme
  root.removeAttribute('data-theme')
  root.removeAttribute('style')
} else {
  // Visual Theme 作为覆盖层叠加
  root.setAttribute('data-theme', themeName)
  root.setAttribute('style', visualCssVars)
}
```

## 代码变更

### 移除的内容

1. **`mounted` 状态**
   - 之前用于控制渲染时机
   - 现在已移除，因为 ThemeProvider 不控制组件显示/隐藏

2. **`applyTheme` 方法**
   - 之前暴露在 context 接口中
   - 现在改为内部方法 `applyVisualTheme` 和 `removeVisualTheme`
   - 外部组件不需要直接调用

### 保留的内容

1. **`theme` 状态**
   - 当前主题名称（`BASE_THEME_NAME` 或 `VisualThemeName`）

2. **`setTheme` 方法**
   - 切换 Visual Theme（禁止切换 Base Theme）

3. **`themeConfig`**
   - 当前 Visual Theme 的配置对象（Base Theme 时为 `null`）

4. **`availableThemes`**
   - 可切换的 Visual Themes 列表

## 验证清单

### ✅ 职责边界验证

- [x] ThemeProvider 不包含任何条件渲染逻辑
- [x] ThemeProvider 不包含任何布局相关的 CSS
- [x] ThemeProvider 不包含任何业务状态管理
- [x] Base Theme 通过 globals.css 的 `:root` 自动加载
- [x] Visual Theme 作为覆盖层叠加在 Base Theme 之上
- [x] 所有 CSS 变量注入都通过内联 `style` 属性完成
- [x] 所有主题标识都通过 `data-theme` 属性完成

### ✅ 代码质量验证

- [x] 无 linter 错误
- [x] 无 TypeScript 错误
- [x] 无未使用的导入
- [x] 所有方法都有清晰的注释说明

## 使用示例

### 读取当前主题

```typescript
import { useTheme } from '@/lib/styles/theme-context'

function MyComponent() {
  const { theme, themeConfig } = useTheme()
  
  // theme: 'base' | 'apple-white'
  // themeConfig: VisualThemeConfig | null
}
```

### 切换主题

```typescript
import { useTheme } from '@/lib/styles/theme-context'

function ThemeSwitcher() {
  const { setTheme, availableThemes } = useTheme()
  
  return (
    <button onClick={() => setTheme('apple-white')}>
      切换到 Apple White
    </button>
  )
}
```

## 注意事项

1. **Base Theme 永远先加载**
   - Base Theme 通过 `globals.css` 的 `:root` 自动加载
   - ThemeProvider 不控制 Base Theme 的加载

2. **Visual Theme 是覆盖层**
   - Visual Theme 不会替换 Base Theme
   - Visual Theme 只覆盖对应的 CSS 变量

3. **不控制组件显示/隐藏**
   - ThemeProvider 始终渲染 `children`
   - 不包含任何条件渲染逻辑

4. **不控制布局或业务逻辑**
   - ThemeProvider 只负责注入 CSS 变量和管理主题 key
   - 不包含任何布局相关的 CSS 或业务逻辑
