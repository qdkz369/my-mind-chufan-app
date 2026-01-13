# Card 组件完整样式定义

## 文件位置

- **组件实现**：`components/ui/card.tsx`
- **全局样式**：`app/globals.css` (第 555-596 行)

---

## 1. Card 组件完整代码

```typescript
import * as React from 'react'

import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
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

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      style={{
        paddingLeft: 'var(--space-card-header-padding, 1rem)',
        paddingRight: 'var(--space-card-header-padding, 1rem)',
        gap: 'var(--space-gap-sm, 0.5rem)',
        paddingBottom: 'var(--space-card-header-padding, 1rem)',
      }}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('', className)}
      style={{
        paddingLeft: 'var(--space-card-body-padding, 1rem)',
        paddingRight: 'var(--space-card-body-padding, 1rem)',
      }}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center [.border-t]:pt-6', className)}
      style={{
        paddingLeft: 'var(--space-card-footer-padding, 1rem)',
        paddingRight: 'var(--space-card-footer-padding, 1rem)',
        paddingTop: 'var(--space-card-footer-padding, 1rem)',
      }}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
```

---

## 2. Card 组件样式分析

### 2.1 样式技术栈

- ✅ **使用 Tailwind CSS**：通过 `className` 使用 Tailwind 工具类
- ❌ **不使用 CSS Module**：没有 `.module.css` 文件
- ❌ **不使用 styled-components**：没有使用 styled-components 库
- ✅ **使用内联样式**：通过 `style` prop 设置 CSS 变量

### 2.2 背景色来源

#### Card 主组件

**Tailwind 类**：
```typescript
'bg-card'  // ← 使用 Tailwind 的 bg-card 类
```

**Tailwind 配置映射**（通过 `tailwind.config.js` 或 `@theme inline`）：
```css
/* app/globals.css 中的 @theme inline */
--color-card: var(--card);
```

**CSS 变量定义**（`app/globals.css`）：
```css
:root {
  --card: rgba(20, 31, 53, 0.95); /* DefaultTheme */
}

[data-theme="apple-white"] {
  --card: #FFFFFF; /* Apple White Theme */
}

[data-theme="industrial-dark"] {
  --card: rgba(20, 31, 53, 0.95); /* Industrial Dark Theme */
}
```

**结论**：
- ✅ **使用 Token**：`bg-card` → `--color-card` → `var(--card)` → 主题变量
- ❌ **不直接写死**：没有硬编码的颜色值（如 `#FFFFFF` 或 `bg-white`）

#### .theme-card 类（全局 CSS）

**CSS 定义**（`app/globals.css` 第 555-596 行）：
```css
.theme-card {
  border-radius: var(--radius-card);
  background-color: var(--card);  /* ← 使用 Token */
  color: var(--card-foreground);  /* ← 使用 Token */
  border: 1px solid var(--border);  /* ← 使用 Token */
  box-shadow: var(--theme-shadow, none);
}
```

**主题特定覆盖**：

**DefaultTheme / Industrial Dark**：
```css
:root:not([data-theme="apple-white"]):not([data-theme="industrial-dark"]) .theme-card,
[data-theme="industrial-dark"] .theme-card {
  /* 卡片背景渐变（基于 --card 颜色，保持层次感） */
  background: linear-gradient(135deg, var(--card) 0%, rgba(15, 23, 42, 0.95) 100%);
  background-color: var(--card); /* 回退色（rgba 透明度） */
  /* 边框（分隔区层，保持层次） */
  border: 0.5px solid rgba(59, 130, 246, 0.25);
  /* 阴影（保持层次感） */
  --theme-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 1px rgba(59, 130, 246, 0.1);
  box-shadow: var(--theme-shadow);
}
```

**Apple White Theme**：
```css
[data-theme="apple-white"] .theme-card {
  --theme-shadow: 0 8px 40px -10px rgba(0, 0, 0, 0.08);
  --shadow-theme-lg: 0 8px 40px -10px rgba(0, 0, 0, 0.08);
  box-shadow: var(--theme-shadow);
  /* 层级隔离：极细的浅灰色描边 */
  border: 0.5px solid rgba(0, 0, 0, 0.05);
}
```

**结论**：
- ✅ **使用 Token**：所有颜色都来自 CSS 变量（`var(--card)`, `var(--card-foreground)`, `var(--border)`）
- ⚠️ **部分硬编码**：在主题特定覆盖中，渐变和边框颜色有部分硬编码（如 `rgba(15, 23, 42, 0.95)`, `rgba(59, 130, 246, 0.25)`），但这些是基于主题设计的特定值

---

## 3. Box-Shadow 使用情况

### 3.1 Card 组件中的 shadow

**Tailwind 类**：
```typescript
'shadow-sm'  // ← Tailwind 的 shadow-sm 类
```

**Tailwind 默认值**：
```css
/* Tailwind 默认 shadow-sm */
box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
```

### 3.2 .theme-card 类中的 box-shadow

**基础定义**：
```css
.theme-card {
  box-shadow: var(--theme-shadow, none);
}
```

**DefaultTheme / Industrial Dark**：
```css
:root:not([data-theme="apple-white"]):not([data-theme="industrial-dark"]) .theme-card,
[data-theme="industrial-dark"] .theme-card {
  --theme-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 1px rgba(59, 130, 246, 0.1);
  box-shadow: var(--theme-shadow);
}
```

**Apple White Theme**：
```css
[data-theme="apple-white"] .theme-card {
  --theme-shadow: 0 8px 40px -10px rgba(0, 0, 0, 0.08);
  box-shadow: var(--theme-shadow);
}
```

**结论**：
- ✅ **使用 box-shadow**：
  - Card 组件：使用 Tailwind 的 `shadow-sm`（默认 `0 1px 2px 0 rgb(0 0 0 / 0.05)`）
  - .theme-card 类：使用 `var(--theme-shadow)`，不同主题有不同的阴影值
- ❌ **不使用 filter**：没有使用 `filter` 属性

---

## 4. Before / After 伪元素

**搜索结果**：
- ❌ **Card 组件中不存在 `::before` 或 `::after` 伪元素**
- ❌ **.theme-card 类中不存在 `::before` 或 `::after` 伪元素**
- ❌ **全局 CSS 中没有 Card 相关的伪元素定义**

**结论**：
- ❌ **不存在 before / after 伪元素**

---

## 5. 完整样式汇总

### 5.1 Card 主组件样式

**Tailwind 类**：
```typescript
'bg-card'              // 背景色：var(--card)
'text-card-foreground' // 文字色：var(--card-foreground)
'flex'                 // display: flex
'flex-col'             // flex-direction: column
'border'               // border: 1px solid var(--border)
'shadow-sm'            // box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)
```

**内联样式**：
```typescript
{
  borderRadius: 'var(--radius-card)',  // 圆角：来自主题变量
  padding: 'var(--space-card-padding-y, 1rem) var(--space-card-padding-x, 1rem)',  // 内边距：来自密度变量
  gap: 'var(--space-gap-card, 0.75rem)',  // 间距：来自密度变量
}
```

**完整 CSS 等价**：
```css
.card {
  /* Tailwind 类 */
  background-color: var(--card);
  color: var(--card-foreground);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  
  /* 内联样式 */
  border-radius: var(--radius-card);
  padding: var(--space-card-padding-y, 1rem) var(--space-card-padding-x, 1rem);
  gap: var(--space-gap-card, 0.75rem);
}
```

### 5.2 .theme-card 类样式

**基础样式**（所有主题通用）：
```css
.theme-card {
  border-radius: var(--radius-card);
  background-color: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  box-shadow: var(--theme-shadow, none);
}
```

**DefaultTheme / Industrial Dark 覆盖**：
```css
:root:not([data-theme="apple-white"]):not([data-theme="industrial-dark"]) .theme-card,
[data-theme="industrial-dark"] .theme-card {
  /* 背景渐变（覆盖 background-color） */
  background: linear-gradient(135deg, var(--card) 0%, rgba(15, 23, 42, 0.95) 100%);
  background-color: var(--card); /* 回退色 */
  
  /* 边框（覆盖基础 border） */
  border: 0.5px solid rgba(59, 130, 246, 0.25);
  
  /* 阴影（覆盖基础 box-shadow） */
  --theme-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 1px rgba(59, 130, 246, 0.1);
  box-shadow: var(--theme-shadow);
}
```

**Apple White Theme 覆盖**：
```css
[data-theme="apple-white"] .theme-card {
  /* 阴影（覆盖基础 box-shadow） */
  --theme-shadow: 0 8px 40px -10px rgba(0, 0, 0, 0.08);
  --shadow-theme-lg: 0 8px 40px -10px rgba(0, 0, 0, 0.08);
  box-shadow: var(--theme-shadow);
  
  /* 边框（覆盖基础 border） */
  border: 0.5px solid rgba(0, 0, 0, 0.05);
}
```

### 5.3 Card 子组件样式

#### CardHeader
```typescript
// Tailwind 类
'@container/card-header'           // Container query
'grid'                              // display: grid
'auto-rows-min'                     // grid-auto-rows: min-content
'grid-rows-[auto_auto]'              // grid-template-rows: auto auto
'items-start'                        // align-items: start
'has-data-[slot=card-action]:grid-cols-[1fr_auto]'  // 条件样式
'[.border-b]:pb-6'                  // 条件样式

// 内联样式
{
  paddingLeft: 'var(--space-card-header-padding, 1rem)',
  paddingRight: 'var(--space-card-header-padding, 1rem)',
  gap: 'var(--space-gap-sm, 0.5rem)',
  paddingBottom: 'var(--space-card-header-padding, 1rem)',
}
```

#### CardTitle
```typescript
// Tailwind 类
'leading-none'    // line-height: 1
'font-semibold'   // font-weight: 600
```

#### CardDescription
```typescript
// Tailwind 类
'text-muted-foreground'  // color: var(--muted-foreground)
'text-sm'                // font-size: 0.875rem
```

#### CardContent
```typescript
// Tailwind 类
''  // 无默认类

// 内联样式
{
  paddingLeft: 'var(--space-card-body-padding, 1rem)',
  paddingRight: 'var(--space-card-body-padding, 1rem)',
}
```

#### CardFooter
```typescript
// Tailwind 类
'flex'              // display: flex
'items-center'      // align-items: center
'[.border-t]:pt-6'  // 条件样式

// 内联样式
{
  paddingLeft: 'var(--space-card-footer-padding, 1rem)',
  paddingRight: 'var(--space-card-footer-padding, 1rem)',
  paddingTop: 'var(--space-card-footer-padding, 1rem)',
}
```

---

## 6. 样式来源总结

### 6.1 背景色来源

| 样式属性 | 来源 | 值 |
|---------|------|-----|
| `background-color` (Card 组件) | Token (`bg-card`) | `var(--card)` |
| `background-color` (.theme-card) | Token | `var(--card)` |
| `background` (DefaultTheme/Industrial Dark) | Token + 硬编码渐变 | `linear-gradient(135deg, var(--card) 0%, rgba(15, 23, 42, 0.95) 100%)` |

**结论**：
- ✅ **主要使用 Token**：`var(--card)` 来自主题变量
- ⚠️ **部分硬编码**：渐变中的 `rgba(15, 23, 42, 0.95)` 是硬编码的，但这是设计特定的值

### 6.2 Box-Shadow 使用

| 样式属性 | 来源 | 值 |
|---------|------|-----|
| `box-shadow` (Card 组件) | Tailwind `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `box-shadow` (.theme-card, DefaultTheme) | Token `var(--theme-shadow)` | `0 4px 20px rgba(0, 0, 0, 0.4), 0 0 1px rgba(59, 130, 246, 0.1)` |
| `box-shadow` (.theme-card, Apple White) | Token `var(--theme-shadow)` | `0 8px 40px -10px rgba(0, 0, 0, 0.08)` |

**结论**：
- ✅ **使用 box-shadow**：Card 组件和 .theme-card 类都使用 box-shadow
- ❌ **不使用 filter**：没有使用 `filter` 属性

### 6.3 Before / After 伪元素

**结论**：
- ❌ **不存在 before / after 伪元素**

### 6.4 样式技术栈

| 技术 | 使用情况 | 说明 |
|------|---------|------|
| **Tailwind CSS** | ✅ 使用 | 通过 `className` 使用 Tailwind 工具类 |
| **CSS Module** | ❌ 不使用 | 没有 `.module.css` 文件 |
| **styled-components** | ❌ 不使用 | 没有使用 styled-components 库 |
| **内联样式** | ✅ 使用 | 通过 `style` prop 设置 CSS 变量 |
| **全局 CSS 类** | ✅ 使用 | `.theme-card` 类定义在 `app/globals.css` 中 |

---

## 7. 完整样式定义（CSS 等价形式）

### 7.1 Card 组件（不使用 .theme-card 类）

```css
/* Card 组件的基础样式 */
[data-slot="card"] {
  /* Tailwind 类转换 */
  background-color: var(--card);
  color: var(--card-foreground);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  
  /* 内联样式 */
  border-radius: var(--radius-card);
  padding: var(--space-card-padding-y, 1rem) var(--space-card-padding-x, 1rem);
  gap: var(--space-gap-card, 0.75rem);
}
```

### 7.2 .theme-card 类（完整样式）

```css
/* 基础样式（所有主题） */
.theme-card {
  border-radius: var(--radius-card);
  background-color: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  box-shadow: var(--theme-shadow, none);
}

/* DefaultTheme / Industrial Dark 覆盖 */
:root:not([data-theme="apple-white"]):not([data-theme="industrial-dark"]) .theme-card,
[data-theme="industrial-dark"] .theme-card {
  background: linear-gradient(135deg, var(--card) 0%, rgba(15, 23, 42, 0.95) 100%);
  background-color: var(--card);
  border: 0.5px solid rgba(59, 130, 246, 0.25);
  --theme-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 1px rgba(59, 130, 246, 0.1);
  box-shadow: var(--theme-shadow);
}

/* Apple White Theme 覆盖 */
[data-theme="apple-white"] .theme-card {
  --theme-shadow: 0 8px 40px -10px rgba(0, 0, 0, 0.08);
  --shadow-theme-lg: 0 8px 40px -10px rgba(0, 0, 0, 0.08);
  box-shadow: var(--theme-shadow);
  border: 0.5px solid rgba(0, 0, 0, 0.05);
}
```

---

## 8. 关键发现

### 8.1 背景色来源
- ✅ **主要使用 Token**：`bg-card` → `var(--card)` → 主题变量
- ⚠️ **部分硬编码**：渐变中的 `rgba(15, 23, 42, 0.95)` 是硬编码的（设计特定值）

### 8.2 Box-Shadow
- ✅ **使用 box-shadow**：
  - Card 组件：Tailwind `shadow-sm`（`0 1px 2px 0 rgb(0 0 0 / 0.05)`）
  - .theme-card：`var(--theme-shadow)`（不同主题有不同值）
- ❌ **不使用 filter**：没有使用 `filter` 属性

### 8.3 Before / After
- ❌ **不存在 before / after 伪元素**

### 8.4 样式技术栈
- ✅ **Tailwind CSS**：主要样式技术
- ✅ **内联样式**：用于 CSS 变量（圆角、间距）
- ✅ **全局 CSS 类**：`.theme-card` 类
- ❌ **CSS Module**：不使用
- ❌ **styled-components**：不使用

---

## 9. 样式优先级

当 Card 组件同时使用 Tailwind 类和 `.theme-card` 类时：

```tsx
<Card className="theme-card" />
```

**样式优先级**（从低到高）：
1. **Card 组件的 Tailwind 类**：`bg-card`, `text-card-foreground`, `border`, `shadow-sm`
2. **Card 组件的内联样式**：`borderRadius`, `padding`, `gap`
3. **.theme-card 基础样式**：`border-radius`, `background-color`, `color`, `border`, `box-shadow`
4. **.theme-card 主题覆盖**：DefaultTheme / Industrial Dark / Apple White 的特定样式

**实际应用**：
- `.theme-card` 的 `background-color` 会覆盖 `bg-card`（如果同时存在）
- `.theme-card` 的 `box-shadow` 会覆盖 `shadow-sm`（如果同时存在）
- 内联样式 `borderRadius` 和 `.theme-card` 的 `border-radius` 都会应用（如果值相同，内联样式优先级更高）

---

## 总结

### 背景色来源
- ✅ **使用 Token**：`var(--card)` 来自主题变量
- ⚠️ **部分硬编码**：渐变中的特定颜色值

### Box-Shadow / Filter
- ✅ **使用 box-shadow**：Card 组件和 .theme-card 类都使用
- ❌ **不使用 filter**：没有使用 `filter` 属性

### Before / After
- ❌ **不存在 before / after 伪元素**

### 样式技术栈
- ✅ **Tailwind CSS**：主要样式技术
- ✅ **内联样式**：用于 CSS 变量
- ✅ **全局 CSS 类**：`.theme-card` 类
- ❌ **CSS Module**：不使用
- ❌ **styled-components**：不使用
