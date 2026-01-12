# 主题系统文件清单和使用方式

## 目的
- 列出所有和 theme / provider / css variable / tailwind config / context 相关的文件
- 说明默认主题是如何注入的
- 说明主题切换是全局还是局部

---

## 文件清单

### 1. 核心主题文件

#### `lib/styles/themes.ts`
**类型**：主题配置定义文件

**关键内容**：
```typescript
// 主题类型定义
export type ThemeName = 'industrial-blue' | 'apple-white'

// 主题配置接口
export interface ThemeConfig {
  name: ThemeName
  displayName: string
  description: string
  colors: { ... }  // 所有颜色定义
  borderRadius: { ... }  // 圆角定义
}

// 主题配置对象
export const themes: Record<ThemeName, ThemeConfig> = {
  'industrial-blue': { ... },
  'apple-white': { ... }
}

// 默认主题
export const defaultTheme: ThemeName = 'industrial-blue'

// 主题存储键名
export const THEME_STORAGE_KEY = 'ios-theme-preference'

// 获取主题CSS变量函数
export function getThemeCSSVariables(theme: ThemeConfig): string
```

**作用**：
- 定义两套主题的完整配置（颜色、圆角等）
- 提供主题到 CSS 变量的转换函数
- 定义默认主题和存储键名

---

#### `lib/styles/theme-context.tsx`
**类型**：React Context Provider

**关键内容**：
```typescript
// Context 类型定义
interface ThemeContextType {
  theme: ThemeName
  themeConfig: typeof themes[ThemeName]
  setTheme: (theme: ThemeName) => void
  applyTheme: (theme: ThemeName) => void
}

// ThemeProvider 组件
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 1. 从 localStorage 加载主题（防止白闪/黑闪）
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    const themeToApply = savedTheme || defaultTheme
    
    // 立即应用主题到DOM（在React渲染之前）
    const root = document.documentElement
    const cssVars = getThemeCSSVariables(themes[themeToApply])
    root.setAttribute('style', cssVars)
    root.setAttribute('data-theme', themeToApply)
    
    setThemeState(themeToApply)
    setMounted(true)
  }, [])

  // 2. 应用主题到DOM
  const applyTheme = useCallback((themeName: ThemeName) => {
    const root = document.documentElement
    const cssVars = getThemeCSSVariables(themes[themeName])
    root.setAttribute('style', cssVars)
    root.setAttribute('data-theme', themeName)
    localStorage.setItem(THEME_STORAGE_KEY, themeName)
  }, [])

  // 3. 主题变化时应用
  useEffect(() => {
    if (mounted) {
      applyTheme(theme)
    }
  }, [theme, mounted, applyTheme])
}

// useTheme Hook
export function useTheme() {
  const context = useContext(ThemeContext)
  return context
}
```

**作用**：
- 提供全局主题 Context
- 管理主题状态和切换逻辑
- 将主题应用到 DOM（通过 `data-theme` 属性和 CSS 变量）
- 持久化主题到 localStorage

---

### 2. UI 组件文件

#### `components/theme-switcher.tsx`
**类型**：主题切换器组件

**关键内容**：
```typescript
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    const newTheme = theme === 'industrial-blue' ? 'apple-white' : 'industrial-blue'
    setTheme(newTheme)  // 调用 Context 的 setTheme
  }

  return (
    <button onClick={toggleTheme}>
      {/* 显示当前主题的图标和文字 */}
    </button>
  )
}
```

**作用**：
- 提供用户界面切换主题
- 调用 `useTheme()` Hook 获取和设置主题

**使用位置**：
- `app/settings/page.tsx`：设置页面中的主题切换器

---

#### `components/theme-provider.tsx`
**类型**：next-themes 包装器（未使用）

**关键内容**：
```typescript
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

**作用**：
- 这是 `next-themes` 的包装器，但**当前项目未使用**
- 实际使用的是 `lib/styles/theme-context.tsx` 中的 `ThemeProvider`

---

### 3. 样式文件

#### `app/globals.css`
**类型**：全局 CSS 文件

**关键内容**：
```css
/* 1. 默认主题：Industrial Blue（:root） */
:root {
  --background: #0A1628;
  --foreground: #E5E8ED;
  --card: #141F35;
  /* ... 所有 CSS 变量定义 */
  --radius-card: 0.25rem; /* 4px */
}

/* 2. Apple White 主题（通过 data-theme 属性应用） */
[data-theme="apple-white"] {
  --background: #F2F2F7;
  --foreground: #1D1D1F;
  --card: #FFFFFF;
  /* ... 所有 CSS 变量定义 */
  --radius-card: 1.5rem; /* 24px */
}

/* 3. Tailwind CSS 变量映射（@theme inline） */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  /* ... 所有 Tailwind 变量映射 */
}

/* 4. 全局背景渐变 */
:root:not([data-theme="apple-white"]) body,
[data-theme="industrial-blue"] body {
  background: linear-gradient(135deg, var(--background) 0%, #060E1A 100%);
}

[data-theme="apple-white"] body {
  background: linear-gradient(to bottom, var(--background) 0%, #FFFFFF 100%);
}

/* 5. 全局过渡动画 */
body {
  transition: background-color 0.4s ease, color 0.4s ease, background 0.4s ease;
}
```

**作用**：
- 定义所有主题的 CSS 变量默认值
- 通过 `[data-theme]` 选择器应用不同主题
- 将 CSS 变量映射到 Tailwind CSS 变量
- 定义全局背景渐变和过渡动画

---

### 4. 布局文件

#### `app/layout.tsx`
**类型**：Next.js 根布局

**关键内容**：
```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 防止主题闪烁：在服务端渲染时立即设置默认主题 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('ios-theme-preference') || 'industrial-blue';
                  var root = document.documentElement;
                  if (theme === 'industrial-blue') {
                    root.setAttribute('data-theme', 'industrial-blue');
                    root.style.setProperty('--background', '#0A1628');
                    // ... 设置关键 CSS 变量
                  } else if (theme === 'apple-white') {
                    root.setAttribute('data-theme', 'apple-white');
                    root.style.setProperty('--background', '#F2F2F7');
                    // ... 设置关键 CSS 变量
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>  {/* 使用 lib/styles/theme-context.tsx 的 ThemeProvider */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**作用**：
- 在 `<head>` 中注入内联脚本，防止主题闪烁（FOUC）
- 包裹 `ThemeProvider`，使所有子组件可以访问主题 Context

---

### 5. 配置文件

#### `postcss.config.mjs`
**类型**：PostCSS 配置

**关键内容**：
```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

**作用**：
- 配置 Tailwind CSS PostCSS 插件
- 处理 `@tailwindcss` 指令和 CSS 变量

---

## 默认主题注入流程

### 1. 服务端渲染（SSR）阶段

**位置**：`app/layout.tsx` 的 `<head>` 内联脚本

**流程**：
```javascript
// 1. 从 localStorage 读取保存的主题（如果存在）
var theme = localStorage.getItem('ios-theme-preference') || 'industrial-blue';

// 2. 立即设置到 document.documentElement
var root = document.documentElement;
root.setAttribute('data-theme', theme);

// 3. 立即设置关键 CSS 变量（防止闪烁）
root.style.setProperty('--background', '#0A1628'); // 或 '#F2F2F7'
```

**目的**：防止"白闪"或"黑闪"（FOUC - Flash of Unstyled Content）

---

### 2. 客户端渲染（CSR）阶段

**位置**：`lib/styles/theme-context.tsx` 的 `ThemeProvider`

**流程**：
```typescript
useEffect(() => {
  // 1. 从 localStorage 读取主题
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  const themeToApply = savedTheme || defaultTheme  // 默认：'industrial-blue'
  
  // 2. 立即应用主题到DOM（在React渲染之前）
  const root = document.documentElement
  const cssVars = getThemeCSSVariables(themes[themeToApply])
  root.setAttribute('style', cssVars)  // 设置所有 CSS 变量
  root.setAttribute('data-theme', themeToApply)  // 设置 data-theme 属性
  
  // 3. 更新 React 状态
  setThemeState(themeToApply)
  setMounted(true)
}, [])
```

**目的**：确保 React 渲染时主题已正确应用

---

### 3. CSS 变量定义

**位置**：`app/globals.css`

**流程**：
```css
/* 默认主题（:root） */
:root {
  --background: #0A1628;  /* Industrial Blue 默认值 */
  /* ... */
}

/* Apple White 主题（通过 data-theme 属性覆盖） */
[data-theme="apple-white"] {
  --background: #F2F2F7;  /* 覆盖默认值 */
  /* ... */
}
```

**目的**：提供 CSS 变量的默认值和主题覆盖规则

---

## 主题切换机制

### 全局切换（✅ 当前实现）

**实现方式**：
1. **Context 管理**：`ThemeProvider` 包裹整个应用（在 `app/layout.tsx` 中）
2. **DOM 属性**：通过 `document.documentElement.setAttribute('data-theme', themeName)` 设置
3. **CSS 变量**：通过 `document.documentElement.setAttribute('style', cssVars)` 设置所有 CSS 变量
4. **CSS 选择器**：通过 `[data-theme="apple-white"]` 选择器覆盖 CSS 变量

**影响范围**：
- ✅ **全局生效**：所有页面、所有组件都会自动应用主题
- ✅ **实时切换**：切换主题时，所有使用 CSS 变量的元素立即更新
- ✅ **持久化**：主题选择保存到 `localStorage`，刷新后保持

**切换流程**：
```
用户点击 ThemeSwitcher
  ↓
调用 setTheme(newTheme)
  ↓
ThemeProvider 的 useEffect 触发
  ↓
调用 applyTheme(newTheme)
  ↓
设置 document.documentElement 的 data-theme 和 style 属性
  ↓
CSS 选择器 [data-theme="apple-white"] 生效
  ↓
所有使用 var(--background) 等 CSS 变量的元素自动更新
  ↓
保存到 localStorage
```

---

### 局部切换（❌ 当前未实现）

**说明**：
- 当前系统**不支持局部主题切换**
- 所有组件都使用全局主题
- 如果需要局部主题，需要：
  1. 创建局部 Context
  2. 使用内联样式覆盖 CSS 变量
  3. 或使用 Tailwind 的 `dark:` 变体（但当前未使用）

---

## 使用方式

### 1. 在组件中使用主题

**方式一：使用 CSS 变量（推荐）**
```tsx
// 在组件中直接使用 Tailwind 类名
<div className="bg-background text-foreground">
  <Card className="bg-card text-card-foreground">
    {/* 内容 */}
  </Card>
</div>
```

**方式二：使用 useTheme Hook**
```tsx
import { useTheme } from "@/lib/styles/theme-context"

function MyComponent() {
  const { theme, themeConfig, setTheme } = useTheme()
  
  // 访问当前主题名称
  console.log(theme)  // 'industrial-blue' 或 'apple-white'
  
  // 访问主题配置
  console.log(themeConfig.colors.background)  // '#0A1628' 或 '#F2F2F7'
  
  // 切换主题
  setTheme('apple-white')
}
```

---

### 2. 在 CSS 中使用主题变量

**方式一：直接使用 CSS 变量**
```css
.my-component {
  background-color: var(--background);
  color: var(--foreground);
  border-radius: var(--radius-card);
}
```

**方式二：使用 Tailwind 类名**
```tsx
<div className="bg-background text-foreground rounded-card">
  {/* 内容 */}
</div>
```

---

### 3. 主题切换器使用

**位置**：`app/settings/page.tsx`

**代码**：
```tsx
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function SettingsPage() {
  return (
    <div>
      <ThemeSwitcher />  {/* 显示主题切换按钮 */}
    </div>
  )
}
```

---

## 文件依赖关系

```
app/layout.tsx
  ├─ 注入内联脚本（防止闪烁）
  └─ 包裹 ThemeProvider
      └─ lib/styles/theme-context.tsx
          ├─ 导入 lib/styles/themes.ts
          ├─ 使用 getThemeCSSVariables()
          └─ 设置 document.documentElement 属性
              └─ app/globals.css
                  ├─ :root { CSS 变量默认值 }
                  └─ [data-theme="apple-white"] { CSS 变量覆盖 }

components/theme-switcher.tsx
  └─ 使用 useTheme() Hook
      └─ lib/styles/theme-context.tsx

所有组件
  └─ 使用 CSS 变量（var(--background) 等）
      └─ app/globals.css
```

---

## 总结

### 默认主题注入
1. **SSR 阶段**：`app/layout.tsx` 内联脚本立即设置主题
2. **CSR 阶段**：`ThemeProvider` 从 localStorage 加载并应用主题
3. **CSS 阶段**：`app/globals.css` 提供 CSS 变量默认值

### 主题切换
- ✅ **全局切换**：通过 `data-theme` 属性和 CSS 变量实现
- ✅ **实时生效**：所有使用 CSS 变量的元素立即更新
- ✅ **持久化**：保存到 localStorage，刷新后保持

### 关键文件
1. `lib/styles/themes.ts`：主题配置定义
2. `lib/styles/theme-context.tsx`：主题 Context 和 Provider
3. `app/globals.css`：CSS 变量定义和主题选择器
4. `app/layout.tsx`：根布局和主题注入脚本
5. `components/theme-switcher.tsx`：主题切换器组件
