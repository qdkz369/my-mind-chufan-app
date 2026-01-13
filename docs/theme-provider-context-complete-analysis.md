# ThemeProvider / ThemeContext 完整代码分析

## 文件位置

- **主要实现**：`lib/styles/theme-context.tsx`
- **使用位置**：`app/layout.tsx` (第 88-92 行)

---

## 1. 完整代码实现

### ThemeContext 定义

```typescript
'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  BASE_THEME_NAME,
  DEFAULT_THEME_NAME,
  DEFAULT_THEME_CONFIG,
  VisualThemeName,
  VISUAL_THEMES,
  SWITCHABLE_VISUAL_THEMES,
  THEME_STORAGE_KEY,
  getVisualThemeCSSVariables,
} from './themes'

/**
 * 主题类型（兼容性）
 */
export type ThemeName = VisualThemeName | typeof BASE_THEME_NAME

interface ThemeContextType {
  theme: ThemeName
  themeConfig: typeof VISUAL_THEMES[VisualThemeName] | null
  setTheme: (theme: ThemeName) => void
  availableThemes: VisualThemeName[]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
```

---

## 2. ThemeProvider 组件完整实现

```typescript
/**
 * ThemeProvider
 * 
 * 职责边界（严格限制）：
 * ✅ 允许：
 *   - 注入 CSS variables（通过内联 style 属性）
 *   - 管理当前 visual theme key（通过 data-theme 属性）
 *   - 读取/写入 localStorage（仅用于 visual theme 持久化）
 * 
 * ⛔ 禁止：
 *   - 控制组件显示/隐藏（不包含任何条件渲染逻辑）
 *   - 控制布局或业务逻辑（不包含任何布局相关的 CSS）
 *   - 控制组件状态（不包含任何业务状态管理）
 * 
 * 核心原则：
 * 1. Base Theme 永远先加载（通过 globals.css 的 :root，不受 ThemeProvider 控制）
 * 2. Visual Theme 以覆盖层形式叠加（通过 data-theme 和 CSS 变量覆盖）
 * 3. Base Theme 不允许被切换、不参与主题选择、不保存到 localStorage
 * 4. 仅 Visual Themes 才能被动态切换和保存到 localStorage
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // ============================================
  // 1. Theme 状态管理
  // ============================================
  
  // 初始状态：Base Theme 作为默认值（Base Theme 通过 globals.css 的 :root 自动加载）
  const [theme, setThemeState] = useState<ThemeName>(BASE_THEME_NAME)

  // ============================================
  // 2. 初始化逻辑（仅在 mount 时执行一次）
  // ============================================
  
  // 初始化：仅在"无本地缓存主题"时才设置 default，否则应用保存的主题
  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement

    // 检查是否有保存的主题
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as VisualThemeName | null
    const isFirstVisit = savedTheme === null

    if (isFirstVisit) {
      // 情况 1：首次访问 - 使用 DefaultTheme
      // DefaultTheme 已经通过 globals.css 的 :root 加载
      // 必须清除 data-theme 和 style，确保完全使用 DefaultTheme（避免内联脚本设置的不完整变量残留）
      console.log('[ThemeProvider] 无本地缓存主题，使用 DefaultTheme')
      root.removeAttribute('data-theme')
      root.removeAttribute('style')
      setThemeState(BASE_THEME_NAME)
      // 不保存到 localStorage，确保 DefaultTheme 始终作为默认值
    } else if (savedTheme && SWITCHABLE_VISUAL_THEMES.includes(savedTheme) && VISUAL_THEMES[savedTheme]) {
      // 情况 2：有保存的有效主题 - 应用保存的 Visual Theme
      // Visual Theme 作为覆盖层叠加在 DefaultTheme 之上
      const visualThemeConfig = VISUAL_THEMES[savedTheme]
      const visualCssVars = getVisualThemeCSSVariables(visualThemeConfig)
      
      // 设置 data-theme 属性（用于 CSS 选择器）
      root.setAttribute('data-theme', savedTheme)
      
      // 注入 Visual Theme 的 CSS 变量（覆盖 DefaultTheme 的对应变量）
      // ⚠️ 重要：只注入视觉相关的 CSS 变量，不包含结构变量（--spacing-*, --layout-*, --font-size-*, --line-height-*, --z-index-*）
      // ⚠️ 重要：Visual Theme 作为覆盖层叠加在 DefaultTheme 之上（CSS @layer visual-theme）
      // ⚠️ 重要：使用完整的 CSS 变量覆盖内联脚本可能设置的不完整变量
      root.setAttribute('style', visualCssVars)
      
      setThemeState(savedTheme)
    } else {
      // 情况 3：保存的主题无效 - 回退到 DefaultTheme（默认主题回退逻辑）
      console.log('[ThemeProvider] 保存的主题无效，清除并使用 DefaultTheme')
      localStorage.removeItem(THEME_STORAGE_KEY)
      root.removeAttribute('data-theme')
      root.removeAttribute('style')
      setThemeState(BASE_THEME_NAME)
    }
  }, [])

  // ============================================
  // 3. 应用 Visual Theme 函数
  // ============================================
  
  // 应用 Visual Theme（作为覆盖层叠加在 Base Theme 之上）
  const applyVisualTheme = useCallback((themeName: VisualThemeName) => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    const visualThemeConfig = VISUAL_THEMES[themeName]

    if (!visualThemeConfig) {
      console.warn('[ThemeProvider] 无效的 Visual Theme:', themeName)
      return
    }

    // Visual Theme 作为覆盖层叠加：
    // 1. Base Theme 的 CSS 变量（来自 globals.css 的 @layer base-theme）仍然存在
    // 2. Visual Theme 的 CSS 变量（通过内联 style，对应 @layer visual-theme）覆盖对应的变量
    // ⚠️ 重要：只注入视觉相关的 CSS 变量，不包含结构变量（--spacing-*, --layout-*, --font-size-*, --line-height-*, --z-index-*）
    const visualCssVars = getVisualThemeCSSVariables(visualThemeConfig)
    root.setAttribute('data-theme', themeName)
    root.setAttribute('style', visualCssVars)
    
    // 保存到 localStorage（仅用于 Visual Theme）
    localStorage.setItem(THEME_STORAGE_KEY, themeName)
  }, [])

  // ============================================
  // 4. 移除 Visual Theme 函数
  // ============================================
  
  // 移除 Visual Theme，回到 Base Theme
  const removeVisualTheme = useCallback(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    
    // 移除 data-theme 和内联样式，回到 Base Theme（通过 globals.css 的 :root）
    root.removeAttribute('data-theme')
    root.removeAttribute('style')
    
    // 删除 localStorage 中的 Visual Theme
    localStorage.removeItem(THEME_STORAGE_KEY)
  }, [])

  // ============================================
  // 5. 主题变化时应用（当 theme 状态改变时触发）
  // ============================================
  
  // 主题变化时应用
  useEffect(() => {
    if (theme === BASE_THEME_NAME || theme === DEFAULT_THEME_NAME) {
      // DefaultTheme（Base Theme）：移除 Visual Theme 覆盖层，回到 DefaultTheme
      // DefaultTheme 已经通过 globals.css 的 :root 加载，只需要移除覆盖层
      removeVisualTheme()
    } else {
      // Visual Theme：作为覆盖层叠加在 DefaultTheme 之上
      applyVisualTheme(theme as VisualThemeName)
    }
  }, [theme, applyVisualTheme, removeVisualTheme])

  // ============================================
  // 6. setTheme 函数（供外部调用）
  // ============================================
  
  const setTheme = useCallback((themeName: ThemeName) => {
    // 允许切换回 DefaultTheme（Base Theme）
    if (themeName === BASE_THEME_NAME || themeName === DEFAULT_THEME_NAME) {
      // 切换回 DefaultTheme：移除 Visual Theme 覆盖层
      setThemeState(BASE_THEME_NAME)
      return
    }
    
    // 只允许切换 Visual Themes
    if (SWITCHABLE_VISUAL_THEMES.includes(themeName as VisualThemeName)) {
      setThemeState(themeName)
    } else {
      console.warn('[ThemeProvider] 无效的主题名称:', themeName)
    }
  }, [])

  // ============================================
  // 7. Context Value 构建
  // ============================================
  
  const value: ThemeContextType = {
    theme,
    themeConfig: theme !== BASE_THEME_NAME ? VISUAL_THEMES[theme as VisualThemeName] : null,
    setTheme,
    availableThemes: SWITCHABLE_VISUAL_THEMES,
  }

  // ============================================
  // 8. Provider 渲染
  // ============================================
  
  // 始终提供 context，不控制组件显示/隐藏
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
```

---

## 3. useTheme Hook

```typescript
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
```

---

## 4. ThemeProvider 使用方式（app/layout.tsx）

```typescript
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 防止主题闪烁：在服务端渲染时立即设置默认主题 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;
                  
                  // 规则：
                  // - DefaultTheme（Base Theme）不设置 data-theme 属性，完全使用 globals.css 的 :root 样式
                  // - 仅当有可切换主题时，才设置 data-theme 和 CSS 变量
                  // - 首次进入系统时，强制使用 DefaultTheme（不设置 data-theme）
                  
                  // 检查是否有可切换的 Visual Theme（仅非 DefaultTheme）
                  var savedTheme = localStorage.getItem('ios-theme-preference');
                  var isFirstVisit = savedTheme === null;
                  
                  if (isFirstVisit) {
                    // 首次进入系统：强制使用 DefaultTheme（不设置 data-theme，完全依赖 globals.css 的 :root）
                    root.removeAttribute('data-theme');
                    root.removeAttribute('style');
                  } else if (savedTheme === 'apple-white') {
                    // 如果保存的是 Apple White 主题，则应用它（设置 data-theme 和 CSS 变量）
                    root.setAttribute('data-theme', 'apple-white');
                    root.style.setProperty('--background', '#F2F2F7');
                    root.style.setProperty('--background-secondary', '#FFFFFF');
                    root.style.setProperty('--foreground', '#1D1D1F');
                  } else if (savedTheme === 'industrial-dark') {
                    // 如果保存的是 Industrial Dark 主题，则应用它（设置 data-theme）
                    root.setAttribute('data-theme', 'industrial-dark');
                    // CSS 变量由 globals.css 的 [data-theme="industrial-dark"] 选择器定义
                  } else {
                    // 否则使用 DefaultTheme（不设置 data-theme，完全依赖 globals.css 的 :root）
                    root.removeAttribute('data-theme');
                    root.removeAttribute('style');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <ThemeProvider>
            {children}
            <Toaster />
            <Analytics />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

**关键点**：
- ✅ **ThemeProvider 包裹整个应用**：`{children}` 和其他全局组件都在 Provider 内部
- ✅ **无 props 传入**：ThemeProvider 不接受任何 props（除了 children），所有配置都在内部管理
- ✅ **内联脚本提前执行**：在 ThemeProvider mount 之前，内联脚本已经设置了初始主题

---

## 5. 关键问题分析

### 5.1 Theme 是如何传入 Provider 的？

**答案**：通过 React Context 的 `value` prop 传入

```typescript
const value: ThemeContextType = {
  theme,                    // ← 从 useState 获取的当前主题状态
  themeConfig: theme !== BASE_THEME_NAME ? VISUAL_THEMES[theme as VisualThemeName] : null,
  setTheme,                 // ← setTheme 函数
  availableThemes: SWITCHABLE_VISUAL_THEMES,
}

return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
```

**流程**：
1. `theme` 状态通过 `useState<ThemeName>(BASE_THEME_NAME)` 管理
2. 初始化时，通过 `useEffect` 从 `localStorage` 读取保存的主题，或使用默认的 `BASE_THEME_NAME`
3. `theme` 状态改变时，通过 `useEffect` 同步到 DOM（设置 `data-theme` 和 `style` 属性）
4. `value` 对象包含 `theme` 状态，通过 Context Provider 传递给所有子组件

**重要**：
- ❌ **ThemeProvider 不接受 theme prop**：所有主题状态都在 Provider 内部管理
- ✅ **通过 Context value 传递**：子组件通过 `useTheme()` Hook 获取 `theme` 状态

---

### 5.2 多主题切换时是否使用 merge / extend？

**答案**：❌ **不使用 merge / extend，使用 CSS 变量覆盖机制**

**实现方式**：

1. **Base Theme（DefaultTheme）**：
   - 定义在 `app/globals.css` 的 `:root` 选择器中
   - 通过 CSS `@layer base-theme` 确保最先加载
   - 所有 CSS 变量都有默认值

2. **Visual Theme**：
   - 通过 `getVisualThemeCSSVariables()` 函数生成完整的 CSS 变量字符串
   - 通过 `root.setAttribute('style', visualCssVars)` 设置内联样式
   - 内联样式优先级高于 CSS 文件中的变量定义

3. **覆盖机制**：
   ```typescript
   // 不是 merge，而是完全替换 style 属性
   root.setAttribute('style', visualCssVars)
   
   // visualCssVars 包含所有需要覆盖的变量，例如：
   // --background: #F2F2F7;
   // --background-secondary: #FFFFFF;
   // --foreground: #1D1D1F;
   // ... (所有视觉相关的变量)
   ```

4. **CSS 层叠机制**：
   ```css
   /* Base Theme（优先级低） */
   :root {
     --background: #0A1628;
   }
   
   /* Visual Theme（优先级高，通过内联 style 或 data-theme 选择器） */
   [data-theme="apple-white"] {
     --background: #F2F2F7;  /* 覆盖 :root 中的值 */
   }
   ```

**关键点**：
- ❌ **不使用 JavaScript 的 merge/extend**：不合并对象，而是通过 CSS 变量覆盖
- ✅ **CSS 变量覆盖**：Visual Theme 的变量覆盖 Base Theme 的对应变量
- ✅ **完整覆盖**：`getVisualThemeCSSVariables()` 返回所有视觉变量的完整列表，不是部分覆盖

---

### 5.3 是否存在默认主题回退逻辑？

**答案**：✅ **存在多层默认主题回退逻辑**

**回退逻辑层级**：

#### 层级 1：初始化时的回退（useEffect，第 70-111 行）

```typescript
useEffect(() => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as VisualThemeName | null
  const isFirstVisit = savedTheme === null

  if (isFirstVisit) {
    // 回退 1：无本地缓存 → 使用 DefaultTheme
    root.removeAttribute('data-theme')
    root.removeAttribute('style')
    setThemeState(BASE_THEME_NAME)
  } else if (savedTheme && SWITCHABLE_VISUAL_THEMES.includes(savedTheme) && VISUAL_THEMES[savedTheme]) {
    // 情况 2：有保存的有效主题 → 应用保存的主题
    // ... 应用主题
  } else {
    // 回退 2：保存的主题无效 → 清除并回退到 DefaultTheme
    console.log('[ThemeProvider] 保存的主题无效，清除并使用 DefaultTheme')
    localStorage.removeItem(THEME_STORAGE_KEY)
    root.removeAttribute('data-theme')
    root.removeAttribute('style')
    setThemeState(BASE_THEME_NAME)
  }
}, [])
```

**回退场景**：
- ✅ **场景 1**：首次访问（`isFirstVisit === true`）→ 回退到 `BASE_THEME_NAME`
- ✅ **场景 2**：保存的主题不在 `SWITCHABLE_VISUAL_THEMES` 中 → 回退到 `BASE_THEME_NAME`
- ✅ **场景 3**：保存的主题在列表中，但 `VISUAL_THEMES[savedTheme]` 不存在 → 回退到 `BASE_THEME_NAME`

#### 层级 2：setTheme 时的验证（第 163-177 行）

```typescript
const setTheme = useCallback((themeName: ThemeName) => {
  // 允许切换回 DefaultTheme（Base Theme）
  if (themeName === BASE_THEME_NAME || themeName === DEFAULT_THEME_NAME) {
    setThemeState(BASE_THEME_NAME)
    return
  }
  
  // 只允许切换 Visual Themes
  if (SWITCHABLE_VISUAL_THEMES.includes(themeName as VisualThemeName)) {
    setThemeState(themeName)
  } else {
    // 回退 3：无效的主题名称 → 忽略，保持当前主题
    console.warn('[ThemeProvider] 无效的主题名称:', themeName)
  }
}, [])
```

**回退场景**：
- ✅ **场景 4**：传入的主题名称不在 `SWITCHABLE_VISUAL_THEMES` 中 → 忽略，保持当前主题（不改变）

#### 层级 3：applyVisualTheme 时的验证（第 114-135 行）

```typescript
const applyVisualTheme = useCallback((themeName: VisualThemeName) => {
  const visualThemeConfig = VISUAL_THEMES[themeName]

  if (!visualThemeConfig) {
    // 回退 4：主题配置不存在 → 警告，不应用
    console.warn('[ThemeProvider] 无效的 Visual Theme:', themeName)
    return
  }
  
  // ... 应用主题
}, [])
```

**回退场景**：
- ✅ **场景 5**：主题配置不存在 → 不应用，保持当前状态

#### 层级 4：内联脚本的提前回退（app/layout.tsx，第 45-84 行）

```javascript
var savedTheme = localStorage.getItem('ios-theme-preference');
var isFirstVisit = savedTheme === null;

if (isFirstVisit) {
  // 回退 5：首次访问 → 清除属性，使用 DefaultTheme
  root.removeAttribute('data-theme');
  root.removeAttribute('style');
} else if (savedTheme === 'apple-white') {
  // 应用 Apple White
} else if (savedTheme === 'industrial-dark') {
  // 应用 Industrial Dark
} else {
  // 回退 6：其他无效主题 → 清除属性，使用 DefaultTheme
  root.removeAttribute('data-theme');
  root.removeAttribute('style');
}
```

**回退场景**：
- ✅ **场景 6**：内联脚本执行时，如果保存的主题不是已知的有效主题 → 回退到 DefaultTheme

**总结**：
- ✅ **6 个回退场景**：确保在任何情况下都能回退到 DefaultTheme
- ✅ **多层验证**：从内联脚本 → 初始化 useEffect → setTheme → applyVisualTheme，每一层都有验证
- ✅ **始终有默认值**：`BASE_THEME_NAME` 作为最终回退值

---

### 5.4 切换主题时是否重新 render？

**答案**：✅ **会触发 React 重新 render，但不会导致整个应用重新渲染**

**详细分析**：

#### 1. ThemeProvider 内部的重新 render

```typescript
const [theme, setThemeState] = useState<ThemeName>(BASE_THEME_NAME)

// 当 setTheme 被调用时
const setTheme = useCallback((themeName: ThemeName) => {
  setThemeState(themeName)  // ← 触发 ThemeProvider 重新 render
}, [])
```

**流程**：
1. 用户调用 `setTheme('apple-white')`
2. `setThemeState('apple-white')` 更新 `theme` 状态
3. **ThemeProvider 组件重新 render**（因为 `theme` 状态改变）
4. `value` 对象重新构建（包含新的 `theme` 值）
5. `ThemeContext.Provider` 的 `value` prop 更新
6. **所有使用 `useTheme()` 的子组件重新 render**（因为 Context value 改变）

#### 2. 子组件的重新 render

```typescript
// 子组件中使用 useTheme
const { theme, setTheme } = useTheme()

// 当 theme 改变时，这个组件会重新 render
// 因为 useContext 会订阅 Context 的变化
```

**影响范围**：
- ✅ **使用 `useTheme()` 的组件会重新 render**
- ❌ **不使用 `useTheme()` 的组件不会重新 render**（除非它们依赖的 props/state 改变）

#### 3. DOM 更新（不触发 React render）

```typescript
useEffect(() => {
  if (theme === BASE_THEME_NAME || theme === DEFAULT_THEME_NAME) {
    removeVisualTheme()  // ← 直接操作 DOM，不触发 React render
  } else {
    applyVisualTheme(theme as VisualThemeName)  // ← 直接操作 DOM，不触发 React render
  }
}, [theme, applyVisualTheme, removeVisualTheme])
```

**DOM 操作**：
```typescript
// 这些操作不触发 React render，只更新 DOM 属性
root.setAttribute('data-theme', themeName)
root.setAttribute('style', visualCssVars)
```

**关键点**：
- ✅ **React 组件会重新 render**：使用 `useTheme()` 的组件会收到新的 `theme` 值
- ✅ **DOM 直接更新**：通过 `setAttribute` 直接更新 DOM，不经过 React 的虚拟 DOM diff
- ✅ **CSS 变量自动应用**：所有使用 `var(--background)` 等 CSS 变量的元素会自动更新样式（浏览器原生行为）
- ✅ **性能优化**：DOM 更新不触发额外的 React render，只有订阅 Context 的组件会重新 render

#### 4. 实际渲染流程示例

```typescript
// 用户点击切换主题按钮
onClick={() => setTheme('apple-white')}
  ↓
// 1. setTheme 被调用
setTheme('apple-white')
  ↓
// 2. setThemeState 更新状态
setThemeState('apple-white')  // theme 状态从 'base' 变为 'apple-white'
  ↓
// 3. ThemeProvider 重新 render
ThemeProvider 组件重新执行
  ↓
// 4. useEffect 检测到 theme 改变
useEffect(() => { ... }, [theme, ...])  // theme 依赖改变，触发 effect
  ↓
// 5. 更新 DOM
root.setAttribute('data-theme', 'apple-white')
root.setAttribute('style', '--background: #F2F2F7; ...')
  ↓
// 6. 所有使用 useTheme() 的子组件重新 render
const { theme } = useTheme()  // theme 从 'base' 变为 'apple-white'，组件重新 render
  ↓
// 7. CSS 变量自动应用到所有元素
所有使用 var(--background) 的元素自动更新样式（浏览器原生，不触发 React render）
```

**总结**：
- ✅ **会重新 render**：ThemeProvider 和所有使用 `useTheme()` 的组件会重新 render
- ✅ **DOM 直接更新**：通过 `setAttribute` 直接更新 DOM，不触发额外的 React render
- ✅ **CSS 自动应用**：CSS 变量的更新是浏览器原生行为，不涉及 React
- ⚠️ **性能考虑**：只有订阅 Context 的组件会重新 render，其他组件不受影响

---

## 6. 完整流程图

### 初始化流程

```
应用启动
  ↓
内联脚本执行（app/layout.tsx）
  ↓
检查 localStorage
  ↓
┌─────────────────┬─────────────────┬─────────────────┐
│ 首次访问        │ 有效主题        │ 无效主题        │
│ (isFirstVisit)  │ (savedTheme)    │ (invalid)       │
└─────────────────┴─────────────────┴─────────────────┘
  ↓                  ↓                  ↓
清除 data-theme   设置 data-theme   清除 data-theme
清除 style        设置 style         清除 style
setThemeState     setThemeState      setThemeState
(BASE_THEME_NAME) (savedTheme)       (BASE_THEME_NAME)
  ↓                  ↓                  ↓
ThemeProvider mount
  ↓
useEffect 初始化（再次验证和同步）
  ↓
应用主题到 DOM
```

### 切换主题流程

```
用户调用 setTheme('apple-white')
  ↓
setThemeState('apple-white')
  ↓
ThemeProvider 重新 render
  ↓
useEffect 检测到 theme 改变
  ↓
applyVisualTheme('apple-white')
  ↓
root.setAttribute('data-theme', 'apple-white')
root.setAttribute('style', visualCssVars)
localStorage.setItem(THEME_STORAGE_KEY, 'apple-white')
  ↓
所有使用 useTheme() 的组件重新 render
  ↓
CSS 变量自动应用到所有元素（浏览器原生）
```

---

## 7. 关键设计决策

### 7.1 为什么不使用 merge/extend？

**原因**：
1. **CSS 变量覆盖机制更简单**：CSS 层叠规则天然支持变量覆盖
2. **性能更好**：不需要 JavaScript 对象合并操作
3. **类型安全**：TypeScript 可以更好地推断类型
4. **清晰明确**：每个主题都是完整的配置，不需要考虑合并逻辑

### 7.2 为什么使用多层回退逻辑？

**原因**：
1. **健壮性**：确保在任何异常情况下都能正常工作
2. **用户体验**：即使 localStorage 损坏，也能正常显示默认主题
3. **开发调试**：多层验证帮助发现配置错误

### 7.3 为什么直接操作 DOM 而不是通过 React？

**原因**：
1. **性能**：直接操作 DOM 比 React 的虚拟 DOM diff 更快
2. **CSS 变量特性**：CSS 变量的更新是浏览器原生行为，不需要 React 参与
3. **全局性**：主题是全局的，直接操作 `document.documentElement` 更直接

---

## 8. 使用示例

### 在组件中使用主题

```typescript
'use client'

import { useTheme } from '@/lib/styles/theme-context'

export function MyComponent() {
  const { theme, setTheme, availableThemes } = useTheme()
  
  return (
    <div>
      <p>当前主题：{theme}</p>
      <button onClick={() => setTheme('apple-white')}>
        切换到 Apple White
      </button>
      <button onClick={() => setTheme('base')}>
        切换到默认主题
      </button>
    </div>
  )
}
```

### 在 CSS 中使用主题变量

```css
.my-component {
  background-color: var(--background);
  color: var(--foreground);
  border-radius: var(--radius-card);
}
```

---

## 总结

### Theme 传入 Provider 的方式
- ✅ 通过 `useState` 管理 `theme` 状态
- ✅ 通过 Context `value` prop 传递给子组件
- ✅ 子组件通过 `useTheme()` Hook 获取

### 多主题切换机制
- ❌ **不使用 merge/extend**
- ✅ **使用 CSS 变量覆盖**：Visual Theme 的变量覆盖 Base Theme 的对应变量
- ✅ **完整覆盖**：每次切换都设置完整的 CSS 变量列表

### 默认主题回退逻辑
- ✅ **6 个回退场景**：确保在任何情况下都能回退到 DefaultTheme
- ✅ **多层验证**：从内联脚本到各个函数都有验证和回退

### 切换主题时的渲染
- ✅ **会重新 render**：ThemeProvider 和所有使用 `useTheme()` 的组件会重新 render
- ✅ **DOM 直接更新**：通过 `setAttribute` 直接更新 DOM，不触发额外的 React render
- ✅ **CSS 自动应用**：CSS 变量的更新是浏览器原生行为
