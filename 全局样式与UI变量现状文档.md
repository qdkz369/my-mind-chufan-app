# 全局样式与 UI 变量现状文档

## 📋 文档说明
本文档详细描述了系统的全局样式系统、CSS 变量定义、主题切换逻辑和 UI 组件规范，用于指导后续的样式统一和主题定制工作。

**生成时间**：2025-01-20  
**扫描范围**：`app/globals.css`、`lib/styles/`、`components/ui/`、所有页面和组件文件

---

## 一、CSS 变量定义 (Theme Variables)

### 1.1 `:root` 默认主题（Industrial Blue）

**位置**：`app/globals.css` 第 17-70 行

**核心颜色变量**：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `--background` | `#0A1628` | 深工业蓝背景 |
| `--background-secondary` | `#0F1B2E` | 次要背景色 |
| `--foreground` | `#E5E8ED` | 纯白或亮青文字 |
| `--foreground-secondary` | `#8B94A6` | 次要文字色 |
| `--card` | `#141F35` | 高对比度面板 |
| `--card-foreground` | `#E5E8ED` | 卡片文字色 |
| `--primary` | `#3B82F6` | 亮蓝色 |
| `--primary-foreground` | `#FFFFFF` | 主色文字（白色） |
| `--muted` | `#1E293B` | 静音背景色 |
| `--muted-foreground` | `#8B94A6` | 静音文字色 |
| `--border` | `#1E293B` | 硬朗边框 |
| `--input` | `#1E293B` | 输入框背景 |
| `--glass` | `rgba(20, 31, 53, 0.7)` | 毛玻璃背景 |
| `--glass-border` | `rgba(59, 130, 246, 0.2)` | 毛玻璃边框 |

**圆角变量**：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `--radius-card` | `0.25rem` (4px) | 卡片圆角 |
| `--radius-button` | `0.25rem` (4px) | 按钮圆角 |
| `--radius-input` | `0.25rem` (4px) | 输入框圆角 |
| `--radius-small` | `0.25rem` (4px) | 小圆角 |
| `--radius` | `0.25rem` (4px) | 默认圆角 |

### 1.2 `[data-theme="apple-white"]` 主题

**位置**：`app/globals.css` 第 73-125 行

**核心颜色变量**：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `--background` | `#F2F2F7` | iOS系统背景色 |
| `--background-secondary` | `#FFFFFF` | 次要背景色（白色） |
| `--foreground` | `#1D1D1F` | 纯深黑文字（增强压重感） |
| `--foreground-secondary` | `#86868B` | 次要文字色（增强对比度） |
| `--card` | `#FFFFFF` | 纯白面板/卡片 |
| `--card-foreground` | `#1D1D1F` | 卡片文字色（深黑） |
| `--primary` | `#007AFF` | iOS系统蓝色 |
| `--primary-foreground` | `#FFFFFF` | 主色文字（白色） |
| `--muted` | `#F5F5F7` | 静音背景色 |
| `--muted-foreground` | `#86868B` | 静音文字色（增强对比度） |
| `--border` | `#E5E5EA` | 极淡边框 |
| `--input` | `#E5E5EA` | 输入框背景 |
| `--glass` | `rgba(255, 255, 255, 0.7)` | 毛玻璃背景 |
| `--glass-border` | `rgba(255, 255, 255, 0.18)` | 毛玻璃边框 |

**圆角变量**：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `--radius-card` | `1.5rem` (24px) | 卡片圆角（Squircle感） |
| `--radius-button` | `1.5rem` (24px) | 按钮圆角 |
| `--radius-input` | `1.5rem` (24px) | 输入框圆角 |
| `--radius-small` | `1rem` (16px) | 小圆角 |
| `--radius` | `1.5rem` (24px) | 默认圆角 |

### 1.3 `@theme inline` 映射变量

**位置**：`app/globals.css` 第 127-173 行

**作用**：将主题变量映射为 Tailwind CSS 可用的变量

**关键映射**：
- `--color-background: var(--background)`
- `--color-foreground: var(--foreground)`
- `--color-card: var(--card)`
- `--color-muted-foreground: var(--muted-foreground)`
- `--radius-sm: var(--radius-small)`
- `--radius-md: calc(var(--radius) * 0.5)`
- `--radius-lg: var(--radius)`
- `--radius-xl: calc(var(--radius) * 1.5)`

---

## 二、主题切换逻辑 (Theme Logic)

### 2.1 ThemeProvider 实现

**文件**：`lib/styles/theme-context.tsx`

**核心逻辑**：

```typescript
// 1. 从 localStorage 加载主题
const savedTheme = localStorage.getItem('ios-theme-preference')

// 2. 应用主题到 DOM
const applyTheme = (themeName: ThemeName) => {
  const root = document.documentElement
  const cssVars = getThemeCSSVariables(themeConfig)
  
  // 设置内联样式（CSS变量）
  root.setAttribute('style', cssVars)
  
  // 设置 data-theme 属性
  root.setAttribute('data-theme', themeName)
  
  // 保存到 localStorage
  localStorage.setItem('ios-theme-preference', themeName)
}
```

**关键点**：
- ✅ 通过 `document.documentElement.setAttribute('data-theme', themeName)` 设置主题
- ✅ 通过 `root.setAttribute('style', cssVars)` 动态设置 CSS 变量
- ✅ 主题持久化到 `localStorage`（键名：`ios-theme-preference`）

### 2.2 主题配置定义

**文件**：`lib/styles/themes.ts`

**主题列表**：
- `industrial-blue` - 工业蓝（默认）
- `apple-white` - 苹果白

**主题配置结构**：
```typescript
{
  name: ThemeName
  displayName: string
  description: string
  colors: { ... }      // 颜色配置
  borderRadius: { ... } // 圆角配置
}
```

**CSS 变量生成函数**：`getThemeCSSVariables(theme: ThemeConfig)`

### 2.3 主题应用机制

**应用流程**：
```
ThemeProvider 初始化
  └─ 从 localStorage 读取主题
  └─ 调用 applyTheme(themeName)
      └─ 生成 CSS 变量字符串
      └─ 设置到 <html> 元素的 style 属性
      └─ 设置 <html> 元素的 data-theme 属性
```

**CSS 选择器优先级**：
1. `[data-theme="apple-white"]` - 高优先级（通过属性选择器）
2. `:root` - 默认值（低优先级）

---

## 三、核心 UI 组件规范

### 3.1 Card 组件

**文件**：`components/ui/card.tsx`

**当前实现**：
```typescript
<div className={cn(
  'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm',
  className
)} />
```

**分析**：
- ✅ 使用 `bg-card`（主题变量）
- ✅ 使用 `text-card-foreground`（主题变量）
- ⚠️ 使用硬编码 `rounded-xl`（应该使用 `var(--radius-card)`）
- ⚠️ 使用硬编码 `shadow-sm`（应该使用主题阴影变量）

**建议改进**：
- 使用 `theme-card` 类（已在 `globals.css` 中定义）
- 或使用 `style={{ borderRadius: 'var(--radius-card)' }}`

### 3.2 Button 组件

**文件**：`components/ui/button.tsx`

**当前实现**：
```typescript
const buttonVariants = cva(
  "ios-button ios-interactive inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl ...",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border bg-background shadow-xs hover:bg-accent',
        // ...
      }
    }
  }
)
```

**分析**：
- ✅ 使用 `bg-primary`、`text-primary-foreground`（主题变量）
- ✅ 使用 `bg-background`、`hover:bg-accent`（主题变量）
- ⚠️ 使用硬编码 `rounded-xl`（应该使用 `var(--radius-button)`）

**建议改进**：
- 使用 `theme-button` 类（已在 `globals.css` 中定义）
- 或使用 `style={{ borderRadius: 'var(--radius-button)' }}`

### 3.3 Input 组件

**文件**：`components/ui/input.tsx`

**当前实现**：
```typescript
<input className={cn(
  'file:text-foreground placeholder:text-muted-foreground ... rounded-md border bg-transparent ...',
  className
)} />
```

**分析**：
- ✅ 使用 `text-foreground`、`text-muted-foreground`（主题变量）
- ✅ 使用 `bg-transparent`（透明背景）
- ⚠️ 使用硬编码 `rounded-md`（应该使用 `var(--radius-input)`）

**建议改进**：
- 使用 `theme-input` 类（已在 `globals.css` 中定义）

### 3.4 主题化工具类

**位置**：`app/globals.css` 第 185-272 行

**已定义的类**：

| 类名 | 说明 | 使用的变量 |
|------|------|-----------|
| `.theme-card` | 主题化卡片 | `var(--radius-card)`, `var(--card)`, `var(--card-foreground)`, `var(--border)`, `var(--theme-shadow)` |
| `.theme-button` | 主题化按钮 | `var(--radius-button)`, `box-shadow`（Apple White 模式） |
| `.theme-input` | 主题化输入框 | `var(--radius-input)`, `var(--input)`, `var(--border)`, `var(--foreground)` |
| `.theme-glass` | 毛玻璃效果 | `var(--glass)`, `var(--glass-border)`, `backdrop-filter` |

**Apple White 模式特殊样式**：
- `.theme-card`：增强阴影 `0 8px 40px -10px rgba(0, 0, 0, 0.08)` + 极细描边 `0.5px solid rgba(0, 0, 0, 0.05)`
- `.theme-button`：按钮阴影 `0 2px 8px rgba(0, 0, 0, 0.08)`
- `.theme-glass`：`backdrop-filter: blur(20px)`

---

## 四、硬编码颜色问题清单

### 4.1 组件文件中的硬编码颜色

**已发现的问题文件**（24 个组件文件）：

1. `components/order-list.tsx` - **严重问题**
   - `bg-slate-900/90`, `border-slate-700/50`（第 79 行）
   - `bg-slate-800/50`（第 69, 81 行）
   - `text-white`, `text-slate-300`, `text-slate-400`, `text-slate-500`（多处）
   - `bg-blue-600`, `text-white`（第 70-74 行）

2. `components/mall-content.tsx` - **已修复**（之前已替换为主题变量）

3. `components/profile-content.tsx` - **已修复**（之前已替换为主题变量）

4. `components/iot-dashboard.tsx` - **已修复**（之前已替换为主题变量）

5. 其他组件文件（疑似遗留代码或未启用页面）：
   - `components/hero.tsx`
   - `components/jizu-mountain.tsx`
   - `components/meditation-section.tsx`
   - `components/local-experiences.tsx`
   - `components/recent-orders.tsx`
   - `components/yunnan-culture.tsx`
   - `components/zen-hero.tsx`

### 4.2 页面文件中的硬编码颜色

**已发现的问题文件**（17 个页面文件）：

1. `app/orders/page.tsx` - **页面本身无问题**，但使用的 `OrderList` 组件有问题
2. `app/mall/page.tsx` - **页面本身无问题**，但使用的 `MallContent` 组件已修复
3. 其他页面文件（疑似遗留代码或未启用页面）：
   - `app/admin/page.tsx`
   - `app/worker/page.tsx`
   - `app/supplier/upload/page.tsx`
   - `app/payment/page.tsx`
   - 等

### 4.3 为什么部分页面仍显示默认主题？

**根本原因**：

1. **组件未使用主题化类**：
   - `components/order-list.tsx` 使用硬编码 `bg-slate-900/90` 而非 `theme-card`
   - `components/ui/card.tsx` 使用硬编码 `rounded-xl` 而非 `var(--radius-card)`

2. **Tailwind 类优先级问题**：
   - 硬编码的 Tailwind 类（如 `bg-slate-900`）优先级高于 CSS 变量
   - 需要使用 `theme-card` 类或内联样式 `style={{ backgroundColor: 'var(--card)' }}`

3. **组件未正确引用主题变量**：
   - 部分组件直接使用 Tailwind 颜色类，而非主题变量类

---

## 五、圆角与阴影 (Design Tokens)

### 5.1 圆角变量定义

**全局圆角变量**：

| 变量名 | Industrial Blue | Apple White | 说明 |
|--------|----------------|-------------|------|
| `--radius-card` | `0.25rem` (4px) | `1.5rem` (24px) | 卡片圆角 |
| `--radius-button` | `0.25rem` (4px) | `1.5rem` (24px) | 按钮圆角 |
| `--radius-input` | `0.25rem` (4px) | `1.5rem` (24px) | 输入框圆角 |
| `--radius-small` | `0.25rem` (4px) | `1rem` (16px) | 小圆角 |
| `--radius` | `0.25rem` (4px) | `1.5rem` (24px) | 默认圆角 |

**Tailwind 映射变量**：

| 变量名 | 计算方式 | 说明 |
|--------|---------|------|
| `--radius-sm` | `var(--radius-small)` | 小圆角 |
| `--radius-md` | `calc(var(--radius) * 0.5)` | 中等圆角 |
| `--radius-lg` | `var(--radius)` | 大圆角 |
| `--radius-xl` | `calc(var(--radius) * 1.5)` | 超大圆角 |

### 5.2 阴影变量定义

**当前状态**：❌ **没有定义统一的阴影变量**

**现有阴影实现**：

1. **Apple White 模式卡片阴影**（`app/globals.css` 第 197 行）：
   ```css
   --theme-shadow: 0 8px 40px -10px rgba(0, 0, 0, 0.08);
   box-shadow: var(--theme-shadow);
   ```

2. **Apple White 模式按钮阴影**（`app/globals.css` 第 215 行）：
   ```css
   box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
   ```

3. **Card 组件默认阴影**（`components/ui/card.tsx`）：
   ```typescript
   className="... shadow-sm"  // Tailwind 默认阴影
   ```

**建议**：定义统一的阴影变量

```css
/* 建议添加 */
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
}

[data-theme="apple-white"] {
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 40px -10px rgba(0, 0, 0, 0.08);
  --shadow-xl: 0 12px 60px -15px rgba(0, 0, 0, 0.1);
}
```

### 5.3 圆角使用现状

**问题**：
- ❌ `components/ui/card.tsx` 使用硬编码 `rounded-xl`（应该使用 `var(--radius-card)`）
- ❌ `components/ui/button.tsx` 使用硬编码 `rounded-xl`（应该使用 `var(--radius-button)`）
- ❌ `components/ui/input.tsx` 使用硬编码 `rounded-md`（应该使用 `var(--radius-input)`）

**已正确使用的组件**：
- ✅ `components/bottom-navigation.tsx` 使用 `style={{ borderRadius: 'var(--radius-button)' }}`
- ✅ 使用 `.theme-card`、`.theme-button`、`.theme-input` 类的组件

---

## 六、强制覆盖（!important）检查

### 6.1 全局搜索结果

**搜索结果**：❌ **未发现 `!important` 使用**

**结论**：系统未使用 `!important` 强制覆盖，主题切换机制正常。

### 6.2 硬编码颜色统计

**组件文件**：24 个文件包含硬编码颜色
**页面文件**：17 个文件包含硬编码颜色

**主要问题文件**：
1. `components/order-list.tsx` - **最严重**（订单列表页面）
2. 其他文件多为遗留代码或未启用页面

---

## 七、核心问题分析

### 7.1 为什么商城、订单页面仍显示默认主题？

**原因 1：组件未使用主题化类**

`components/order-list.tsx` 第 79 行：
```typescript
<Card className="p-4 bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
```

**问题**：
- 使用硬编码 `bg-slate-900/90` 而非 `theme-card`
- 使用硬编码 `border-slate-700/50` 而非 `border-border`

**解决方案**：
```typescript
<Card className="theme-card p-4">
```

**原因 2：基础 UI 组件未完全主题化**

`components/ui/card.tsx` 第 10 行：
```typescript
className="bg-card text-card-foreground ... rounded-xl ..."
```

**问题**：
- 使用硬编码 `rounded-xl` 而非 `var(--radius-card)`
- 使用硬编码 `shadow-sm` 而非主题阴影变量

**解决方案**：
- 使用 `.theme-card` 类（已在 `globals.css` 中定义）
- 或修改组件使用 `style={{ borderRadius: 'var(--radius-card)' }}`

### 7.2 主题变量应用机制

**当前机制**：
1. `ThemeProvider` 设置 `data-theme` 属性到 `<html>` 元素
2. CSS 通过 `[data-theme="apple-white"]` 选择器覆盖 `:root` 变量
3. 组件通过 `var(--variable-name)` 或 Tailwind 类（如 `bg-card`）使用变量

**问题**：
- 硬编码的 Tailwind 类（如 `bg-slate-900`）优先级高于 CSS 变量
- 需要使用主题化类或内联样式

---

## 八、统一修改方案

### 8.1 如果要把全站圆角统一改为 24px

**需要修改的核心文件**：

1. **`app/globals.css`**（必须）
   - 修改 `:root` 下的所有 `--radius-*` 变量为 `1.5rem` (24px)
   - 修改 `[data-theme="apple-white"]` 下的所有 `--radius-*` 变量为 `1.5rem` (24px)

2. **`lib/styles/themes.ts`**（必须）
   - 修改 `industrial-blue` 主题的 `borderRadius` 配置：
     ```typescript
     borderRadius: {
       card: '1.5rem',    // 改为 24px
       button: '1.5rem',  // 改为 24px
       input: '1.5rem',   // 改为 24px
       small: '1rem',     // 改为 16px（小圆角保持较小）
     }
     ```

3. **`components/ui/card.tsx`**（建议）
   - 将硬编码 `rounded-xl` 改为使用 `var(--radius-card)`
   - 或使用 `.theme-card` 类

4. **`components/ui/button.tsx`**（建议）
   - 将硬编码 `rounded-xl` 改为使用 `var(--radius-button)`
   - 或使用 `.theme-button` 类

5. **`components/ui/input.tsx`**（建议）
   - 将硬编码 `rounded-md` 改为使用 `var(--radius-input)`
   - 或使用 `.theme-input` 类

### 8.2 如果要把全站背景统一改为淡灰色 #F2F2F7

**需要修改的核心文件**：

1. **`app/globals.css`**（必须）
   - 修改 `:root` 下的 `--background: #F2F2F7`
   - 修改 `[data-theme="apple-white"]` 下的 `--background: #F2F2F7`（已经是该值）

2. **`lib/styles/themes.ts`**（必须）
   - 修改 `industrial-blue` 主题的 `colors.background: '#F2F2F7'`

3. **检查所有页面和组件**（建议）
   - 确保没有硬编码 `bg-slate-900`、`bg-blue-950` 等深色背景
   - 确保所有页面使用 `bg-background` 或 `theme-card`

### 8.3 完整修改清单

**如果要同时修改圆角和背景**：

#### 必须修改的文件（3 个）：
1. ✅ `app/globals.css`
   - 修改 `:root` 下的 `--background` 和所有 `--radius-*` 变量
   - 修改 `[data-theme="apple-white"]` 下的变量（如需要）

2. ✅ `lib/styles/themes.ts`
   - 修改 `industrial-blue` 主题的 `colors.background` 和 `borderRadius` 配置

3. ✅ `lib/styles/theme-context.tsx`
   - 无需修改（自动应用 themes.ts 的配置）

#### 建议修改的文件（3 个）：
4. ⚠️ `components/ui/card.tsx`
   - 将 `rounded-xl` 改为使用 `var(--radius-card)` 或 `.theme-card` 类

5. ⚠️ `components/ui/button.tsx`
   - 将 `rounded-xl` 改为使用 `var(--radius-button)` 或 `.theme-button` 类

6. ⚠️ `components/ui/input.tsx`
   - 将 `rounded-md` 改为使用 `var(--radius-input)` 或 `.theme-input` 类

#### 需要修复的组件文件（1 个）：
7. ❌ `components/order-list.tsx`
   - 将所有硬编码颜色替换为主题变量
   - 使用 `theme-card` 类替代 `bg-slate-900/90`

---

## 九、主题化类使用指南

### 9.1 推荐的主题化类

| 类名 | 用途 | 替代方案 |
|------|------|---------|
| `.theme-card` | 卡片容器 | `bg-card text-card-foreground border border-border` + `style={{ borderRadius: 'var(--radius-card)' }}` |
| `.theme-button` | 按钮 | `style={{ borderRadius: 'var(--radius-button)' }}` |
| `.theme-input` | 输入框 | `style={{ borderRadius: 'var(--radius-input)' }}` |
| `.theme-glass` | 毛玻璃效果 | `bg-glass border border-glass-border backdrop-blur-20` |

### 9.2 颜色类使用指南

| Tailwind 类 | 对应的 CSS 变量 | 说明 |
|------------|----------------|------|
| `bg-background` | `var(--background)` | 页面背景 |
| `bg-card` | `var(--card)` | 卡片背景 |
| `text-foreground` | `var(--foreground)` | 主文字色 |
| `text-muted-foreground` | `var(--muted-foreground)` | 次要文字色 |
| `bg-primary` | `var(--primary)` | 主色背景 |
| `text-primary-foreground` | `var(--primary-foreground)` | 主色文字 |
| `border-border` | `var(--border)` | 边框色 |

### 9.3 禁止使用的类

| 禁止的类 | 原因 | 替代方案 |
|---------|------|---------|
| `bg-slate-900` | 硬编码深色，不响应主题 | `bg-background` 或 `bg-card` |
| `text-white` | 硬编码白色，不响应主题 | `text-foreground` 或 `text-primary-foreground` |
| `rounded-xl` | 硬编码圆角，不响应主题 | `theme-card` 类或 `style={{ borderRadius: 'var(--radius-card)' }}` |
| `shadow-sm` | 硬编码阴影，不响应主题 | 使用主题阴影变量（待定义） |

---

## 十、阴影变量建议

### 10.1 建议的阴影变量定义

**在 `app/globals.css` 中添加**：

```css
:root {
  /* 阴影变量 - Industrial Blue */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.2);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.25);
}

[data-theme="apple-white"] {
  /* 阴影变量 - Apple White（柔和阴影） */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 40px -10px rgba(0, 0, 0, 0.08);
  --shadow-xl: 0 12px 60px -15px rgba(0, 0, 0, 0.1);
}
```

### 10.2 使用方式

**在组件中使用**：
```typescript
<div style={{ boxShadow: 'var(--shadow-lg)' }}>
  {/* 内容 */}
</div>
```

**或定义工具类**：
```css
.shadow-theme-sm { box-shadow: var(--shadow-sm); }
.shadow-theme-md { box-shadow: var(--shadow-md); }
.shadow-theme-lg { box-shadow: var(--shadow-lg); }
.shadow-theme-xl { box-shadow: var(--shadow-xl); }
```

---

## 十一、总结与建议

### 11.1 当前状态总结

**✅ 已完成**：
- CSS 变量系统已完整定义（两套主题）
- ThemeProvider 已正确集成到根布局
- 主题切换逻辑正常工作
- 部分组件已使用主题变量

**⚠️ 待改进**：
- 基础 UI 组件（Card、Button、Input）仍使用硬编码圆角
- 部分组件（如 OrderList）仍使用硬编码颜色
- 未定义统一的阴影变量系统

### 11.2 统一修改核心文件清单

**如果要统一修改圆角为 24px 和背景为 #F2F2F7**：

#### 必须修改（3 个文件）：
1. ✅ `app/globals.css` - 修改 CSS 变量定义
2. ✅ `lib/styles/themes.ts` - 修改主题配置
3. ✅ `components/order-list.tsx` - 修复硬编码颜色

#### 建议修改（3 个文件）：
4. ⚠️ `components/ui/card.tsx` - 使用主题变量圆角
5. ⚠️ `components/ui/button.tsx` - 使用主题变量圆角
6. ⚠️ `components/ui/input.tsx` - 使用主题变量圆角

### 11.3 快速修复方案

**修复 OrderList 组件**：
```typescript
// 修改前
<Card className="p-4 bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">

// 修改后
<Card className="theme-card p-4">
```

**修复基础 UI 组件**：
```typescript
// Card 组件
className={cn('theme-card flex flex-col gap-6 py-6', className)}

// Button 组件
className={cn(buttonVariants({ variant, size }), 'theme-button', className)}

// Input 组件
className={cn('theme-input ...', className)}
```

---

**文档版本**：v1.0  
**最后更新**：2025-01-20  
**维护者**：Cursor AI Assistant
