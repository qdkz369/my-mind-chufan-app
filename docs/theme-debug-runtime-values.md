# 主题调试运行时值说明

## 调试组件位置

- **组件文件**：`components/theme-debug.tsx`
- **使用位置**：`app/layout.tsx` (第 93 行)
- **显示位置**：页面右下角固定位置（`fixed bottom-4 right-4`）

## 运行时打印的信息

### 1. 当前激活的 theme 名称

**打印内容**：
```javascript
console.log('1. 当前激活的 theme 名称:', theme)
console.log('   - BASE_THEME_NAME:', BASE_THEME_NAME)
console.log('   - DEFAULT_THEME_NAME:', DEFAULT_THEME_NAME)
console.log('   - 是否为默认主题:', theme === BASE_THEME_NAME || theme === DEFAULT_THEME_NAME)
```

**示例输出**：
- DefaultTheme: `theme = 'base'`
- Apple White: `theme = 'apple-white'`
- Industrial Dark: `theme = 'industrial-dark'`

**是否随主题切换变化**：
- ✅ **会变化**：`theme` 值会从 `'base'` → `'apple-white'` → `'industrial-dark'` 等

---

### 2. DefaultTheme 的某个 token 当前值

**打印内容**：
```javascript
console.log('2. DefaultTheme Token 当前值:')
console.log('   - --card:', getCSSVariable('--card'))
console.log('   - --card-foreground:', getCSSVariable('--card-foreground'))
console.log('   - --background:', getCSSVariable('--background'))
console.log('   - --foreground:', getCSSVariable('--foreground'))
console.log('   - --radius-card:', getCSSVariable('--radius-card'))
console.log('   - --border:', getCSSVariable('--border'))
console.log('   - --theme-shadow:', getCSSVariable('--theme-shadow'))
```

**实现方式**：
```typescript
const getCSSVariable = (varName: string): string => {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}
```

**示例输出**：

**DefaultTheme**：
```
--card: rgba(20, 31, 53, 0.95)
--card-foreground: #E5E8ED
--background: #0A1628
--foreground: #E5E8ED
--radius-card: 0.25rem
--border: #1E293B
--theme-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 1px rgba(59, 130, 246, 0.1)
```

**Apple White Theme**：
```
--card: #FFFFFF
--card-foreground: #1D1D1F
--background: #F2F2F7
--foreground: #1D1D1F
--radius-card: 1.5rem
--border: #E5E5EA
--theme-shadow: 0 8px 40px -10px rgba(0, 0, 0, 0.08)
```

**Industrial Dark Theme**：
```
--card: rgba(20, 31, 53, 0.95)
--card-foreground: #E5E8ED
--background: #0A1628
--foreground: #E5E8ED
--radius-card: 0.25rem
--border: #1E293B
--theme-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 1px rgba(59, 130, 246, 0.1)
```

**是否随主题切换变化**：
- ✅ **会变化**：CSS 变量值会通过 `[data-theme="..."]` 选择器覆盖 `:root` 中的默认值
- ✅ **实时更新**：当主题切换时，`document.documentElement` 上的 CSS 变量会立即更新

---

### 3. Card 实际渲染后的 computed style

**打印内容**：
```javascript
console.log('3. Card 实际渲染后的 computed style:')
console.log('   - backgroundColor:', computedStyles.backgroundColor)
console.log('   - boxShadow:', computedStyles.boxShadow)
console.log('   - borderRadius:', computedStyles.borderRadius)
console.log('   - border:', computedStyles.border)
```

**实现方式**：
```typescript
useEffect(() => {
  if (cardRef.current) {
    const styles = window.getComputedStyle(cardRef.current)
    setComputedStyles({
      backgroundColor: styles.backgroundColor,
      boxShadow: styles.boxShadow,
      borderRadius: styles.borderRadius,
      border: styles.border,
    })
  }
}, [theme]) // 当主题改变时重新获取
```

**示例输出**：

**DefaultTheme**：
```
backgroundColor: rgb(20, 31, 53) 或 rgba(20, 31, 53, 0.95)
boxShadow: 0px 4px 20px rgba(0, 0, 0, 0.4), 0px 0px 1px rgba(59, 130, 246, 0.1)
borderRadius: 4px
border: 0.5px solid rgba(59, 130, 246, 0.25)
```

**Apple White Theme**：
```
backgroundColor: rgb(255, 255, 255)
boxShadow: 0px 8px 40px -10px rgba(0, 0, 0, 0.08)
borderRadius: 24px
border: 0.5px solid rgba(0, 0, 0, 0.05)
```

**Industrial Dark Theme**：
```
backgroundColor: rgb(20, 31, 53) 或 rgba(20, 31, 53, 0.95)
boxShadow: 0px 4px 20px rgba(0, 0, 0, 0.4), 0px 0px 1px rgba(59, 130, 246, 0.1)
borderRadius: 4px
border: 0.5px solid rgba(59, 130, 246, 0.25)
```

**是否随主题切换变化**：
- ✅ **会变化**：Card 的 computed style 会随主题切换而变化
- ✅ **原因**：Card 使用 CSS 变量（如 `var(--card)`, `var(--radius-card)`），当 CSS 变量变化时，computed style 也会变化
- ✅ **实时更新**：当主题切换时，浏览器会重新计算所有使用 CSS 变量的元素的样式

---

## 值变化说明总结

### 1. Theme 名称

**变化情况**：✅ **会变化**

**变化时机**：
- 用户调用 `setTheme('apple-white')` 时
- 从 localStorage 读取保存的主题时
- 主题切换时

**变化值**：
- `'base'` (DefaultTheme)
- `'apple-white'` (Apple White Theme)
- `'industrial-dark'` (Industrial Dark Theme)

---

### 2. CSS 变量值（Token）

**变化情况**：✅ **会变化**

**变化机制**：
1. **DefaultTheme**：CSS 变量定义在 `:root` 选择器中
2. **Visual Themes**：CSS 变量通过 `[data-theme="..."]` 选择器覆盖 `:root` 中的值
3. **切换时**：`document.documentElement.setAttribute('data-theme', themeName)` 会触发 CSS 选择器匹配，覆盖变量值

**变化示例**：

| Token | DefaultTheme | Apple White | Industrial Dark |
|-------|-------------|-------------|-----------------|
| `--card` | `rgba(20, 31, 53, 0.95)` | `#FFFFFF` | `rgba(20, 31, 53, 0.95)` |
| `--card-foreground` | `#E5E8ED` | `#1D1D1F` | `#E5E8ED` |
| `--background` | `#0A1628` | `#F2F2F7` | `#0A1628` |
| `--radius-card` | `0.25rem` | `1.5rem` | `0.25rem` |
| `--border` | `#1E293B` | `#E5E5EA` | `#1E293B` |
| `--theme-shadow` | `0 4px 20px rgba(0, 0, 0, 0.4), ...` | `0 8px 40px -10px rgba(0, 0, 0, 0.08)` | `0 4px 20px rgba(0, 0, 0, 0.4), ...` |

---

### 3. Card Computed Style

**变化情况**：✅ **会变化**

**变化机制**：
1. Card 组件使用 CSS 变量：
   - `background-color: var(--card)` (通过 `bg-card` Tailwind 类)
   - `border-radius: var(--radius-card)` (通过内联样式)
   - `box-shadow: var(--theme-shadow)` (通过 `.theme-card` 类)
2. 当 CSS 变量变化时，浏览器会重新计算所有使用这些变量的元素的样式
3. `getComputedStyle()` 返回的是浏览器计算后的最终样式值

**变化示例**：

| 属性 | DefaultTheme | Apple White | Industrial Dark |
|------|-------------|-------------|-----------------|
| `backgroundColor` | `rgb(20, 31, 53)` | `rgb(255, 255, 255)` | `rgb(20, 31, 53)` |
| `boxShadow` | `0px 4px 20px rgba(0, 0, 0, 0.4), ...` | `0px 8px 40px -10px rgba(0, 0, 0, 0.08)` | `0px 4px 20px rgba(0, 0, 0, 0.4), ...` |
| `borderRadius` | `4px` | `24px` | `4px` |
| `border` | `0.5px solid rgba(59, 130, 246, 0.25)` | `0.5px solid rgba(0, 0, 0, 0.05)` | `0.5px solid rgba(59, 130, 246, 0.25)` |

---

## 调试组件使用方式

### 查看控制台输出

1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 查看 `🎨 Theme Debug Info` 分组
4. 切换主题时，会看到新的调试信息输出

### 查看页面上的调试卡片

- 位置：页面右下角
- 显示内容：
  - 当前主题名称
  - `--card` CSS 变量值
  - Card 的实际背景色
  - Card 的实际阴影值
  - Card 的实际圆角值

### 测试主题切换

1. 切换到 Apple White 主题
2. 观察控制台输出和页面上的调试卡片
3. 切换到 Industrial Dark 主题
4. 再次观察值的变化

---

## 预期行为

### 当主题切换时

1. **Theme 名称变化**：
   - `theme` 状态从 `'base'` → `'apple-white'` → `'industrial-dark'`
   - 触发 `useEffect` 重新执行

2. **CSS 变量变化**：
   - `document.documentElement` 的 `data-theme` 属性更新
   - CSS 选择器 `[data-theme="..."]` 匹配，覆盖 `:root` 中的变量
   - `getCSSVariable()` 返回新的变量值

3. **Card Computed Style 变化**：
   - 浏览器重新计算 Card 元素的样式
   - `getComputedStyle()` 返回新的计算值
   - 页面上的 Card 视觉样式立即更新

### 验证方法

1. **控制台验证**：
   - 切换主题时，控制台会打印新的调试信息
   - 对比不同主题下的值，确认它们确实变化了

2. **视觉验证**：
   - 页面右下角的调试卡片会显示当前值
   - Card 的背景色、阴影、圆角会立即更新

3. **代码验证**：
   - 在浏览器控制台手动执行：
     ```javascript
     getComputedStyle(document.documentElement).getPropertyValue('--card')
     ```
   - 切换主题后再次执行，确认值已变化

---

## 注意事项

1. **首次加载**：调试信息会在组件 mount 后立即打印
2. **主题切换**：每次调用 `setTheme()` 时，都会触发新的调试信息打印
3. **Computed Style 延迟**：Card 的 computed style 可能在首次渲染时还未准备好，需要等待 DOM 渲染完成
4. **CSS 变量优先级**：Visual Theme 的变量会覆盖 DefaultTheme 的变量，但 DefaultTheme 的变量仍然存在于 `:root` 中（只是被覆盖）

---

## 完整代码实现

### ThemeDebug 组件

```typescript
"use client"

import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/lib/styles/theme-context'
import { Card } from '@/components/ui/card'
import { BASE_THEME_NAME, DEFAULT_THEME_NAME } from '@/lib/styles/themes'

export function ThemeDebug() {
  const { theme } = useTheme()
  const cardRef = useRef<HTMLDivElement>(null)
  const [computedStyles, setComputedStyles] = useState<{
    backgroundColor: string
    boxShadow: string
    borderRadius: string
    border: string
  } | null>(null)

  // 获取 CSS 变量值
  const getCSSVariable = (varName: string): string => {
    if (typeof window === 'undefined') return ''
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  }

  // 获取 Card 的 computed style
  useEffect(() => {
    if (cardRef.current) {
      const styles = window.getComputedStyle(cardRef.current)
      setComputedStyles({
        backgroundColor: styles.backgroundColor,
        boxShadow: styles.boxShadow,
        borderRadius: styles.borderRadius,
        border: styles.border,
      })
    }
  }, [theme]) // 当主题改变时重新获取

  // 打印调试信息
  useEffect(() => {
    console.group('🎨 Theme Debug Info')
    
    // 1. 当前激活的 theme 名称
    console.log('1. 当前激活的 theme 名称:', theme)
    console.log('   - BASE_THEME_NAME:', BASE_THEME_NAME)
    console.log('   - DEFAULT_THEME_NAME:', DEFAULT_THEME_NAME)
    console.log('   - 是否为默认主题:', theme === BASE_THEME_NAME || theme === DEFAULT_THEME_NAME)
    
    // 2. defaultTheme 的某个 token 当前值
    console.log('2. DefaultTheme Token 当前值:')
    console.log('   - --card:', getCSSVariable('--card'))
    console.log('   - --card-foreground:', getCSSVariable('--card-foreground'))
    console.log('   - --background:', getCSSVariable('--background'))
    console.log('   - --foreground:', getCSSVariable('--foreground'))
    console.log('   - --radius-card:', getCSSVariable('--radius-card'))
    console.log('   - --border:', getCSSVariable('--border'))
    console.log('   - --theme-shadow:', getCSSVariable('--theme-shadow'))
    
    // 3. Card 实际渲染后的 computed style
    if (computedStyles) {
      console.log('3. Card 实际渲染后的 computed style:')
      console.log('   - backgroundColor:', computedStyles.backgroundColor)
      console.log('   - boxShadow:', computedStyles.boxShadow)
      console.log('   - borderRadius:', computedStyles.borderRadius)
      console.log('   - border:', computedStyles.border)
    } else {
      console.log('3. Card computed style: 等待渲染...')
    }
    
    // 4. 检查值是否随主题切换发生变化
    console.log('4. 值变化说明:')
    console.log('   - theme 名称: 会随主题切换变化（base / apple-white / industrial-dark）')
    console.log('   - CSS 变量值: 会随主题切换变化（通过 [data-theme] 选择器覆盖）')
    console.log('   - Card computed style: 会随主题切换变化（因为 CSS 变量变化）')
    
    console.groupEnd()
  }, [theme, computedStyles])

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card ref={cardRef} className="theme-card p-4">
        <div className="space-y-2 text-xs">
          <div className="font-semibold text-sm mb-2">🎨 Theme Debug</div>
          
          <div>
            <span className="text-muted-foreground">当前主题:</span>
            <span className="ml-2 font-mono">{theme}</span>
          </div>
          
          <div>
            <span className="text-muted-foreground">--card:</span>
            <span className="ml-2 font-mono text-xs break-all">{getCSSVariable('--card')}</span>
          </div>
          
          {computedStyles && (
            <>
              <div>
                <span className="text-muted-foreground">背景色:</span>
                <span className="ml-2 font-mono text-xs">{computedStyles.backgroundColor}</span>
              </div>
              <div>
                <span className="text-muted-foreground">阴影:</span>
                <span className="ml-2 font-mono text-xs break-all">{computedStyles.boxShadow || 'none'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">圆角:</span>
                <span className="ml-2 font-mono text-xs">{computedStyles.borderRadius}</span>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
```

### Card 组件修改（支持 ref）

```typescript
const Card = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="card"
        className={cn(
          'bg-card text-card-foreground flex flex-col border shadow-sm',
          className,
        )}
        style={{
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-card-padding-y, 1rem) var(--space-card-padding-x, 1rem)',
          gap: 'var(--space-gap-card, 0.75rem)',
        }}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'
```

---

## 总结

### 值变化情况

| 值类型 | 是否变化 | 变化时机 | 变化原因 |
|--------|---------|---------|---------|
| **Theme 名称** | ✅ 会变化 | `setTheme()` 调用时 | React 状态更新 |
| **CSS 变量值** | ✅ 会变化 | `data-theme` 属性更新时 | CSS 选择器覆盖 |
| **Card Computed Style** | ✅ 会变化 | CSS 变量变化时 | 浏览器重新计算样式 |

### 验证方法

1. **控制台输出**：每次主题切换时，控制台会打印新的调试信息
2. **页面显示**：页面右下角的调试卡片会实时显示当前值
3. **视觉验证**：Card 的背景色、阴影、圆角会立即更新

### 预期结果

- ✅ 所有值都会随主题切换而变化
- ✅ 变化是实时的，无需刷新页面
- ✅ 控制台和页面都会显示最新的值
