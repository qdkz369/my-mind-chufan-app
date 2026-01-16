# 3. 全局样式与主题底层 (Theme & Style Engine) - 第一部分

**生成时间**：2025-01-20  
**文档版本**：v1.0

---

## 一、主题系统架构

### 1.1 核心设计原则

**职责边界（严格限制）**：

✅ **Theme 系统只控制**：
- **颜色（colors）**：背景色、前景色、主色、状态色等
- **字体（font-family）**：字体家族，不控制字体大小
- **阴影（shadows）**：box-shadow 样式
- **圆角（border-radius）**：视觉圆角大小

⛔ **Theme 系统严禁控制**：
- **布局结构**（Grid / Flex 方向）→ 已迁移到 `BaseLayout` / `DashboardLayout` 组件
- **卡片信息层级**（标题 / 主数值 / 辅助说明）→ 已迁移到 `CardSkeleton` 组件
- **组件密度**（padding / gap）→ 已迁移到 `density.css`（`data-density` 属性）
- **信息显示顺序** → 已迁移到 `CardSkeleton` 组件
- **字体大小**（font-size）→ 设计系统基础变量（不属于 Theme）
- **行高**（line-height）→ 设计系统基础变量（部分在 `density.css` 中）
- **间距**（spacing）→ 设计系统基础变量（部分在 `density.css` 中）
- **层级**（z-index）→ 设计系统基础变量（不属于 Theme）

---

### 1.2 CSS 加载顺序

**文件位置**：`app/globals.css`

**Layer 定义**（使用 `@layer` 确保加载顺序）：
```css
@layer base-theme, visual-theme, user-overrides;
```

**加载顺序**：
1. **base-theme**（最先加载，不可覆盖）
   - 通过 `:root` 定义
   - 包含所有设计系统基础变量和视觉样式默认值
   - 永远先加载，不受 JavaScript 控制

2. **visual-theme**（其次加载，覆盖视觉变量）
   - 通过 `[data-theme="..."]` 或 `.theme-apple` 定义
   - 作为覆盖层叠加在 Base Theme 之上
   - 可以被 JavaScript 动态切换

3. **user-overrides**（最后加载，预留）
   - 未来用户自定义覆盖层
   - 当前未实现

---

### 1.3 主题类型

#### DefaultTheme（默认主题，不可删除、不可关闭）

**标识**：`DEFAULT_THEME_NAME = 'default'`

**特点**：
- 不可删除（`isUndeletable: true`）
- 不可关闭（`isUnclosable: true`）
- 所有用户首次进入系统时强制使用
- 不参与主题切换，始终作为基础存在

**设计原则**：
- 背景、卡片、分隔区必须有明确亮度层级
- 不使用 Apple 风格的纯白/灰阶
- 保留深色渐变背景
- 卡片允许使用轻微透明度（rgba）或 gradient

**亮度层级**（从暗到亮）：
1. **背景层（最暗）**：`#0A1628` → `#0F1B2E`
2. **卡片层（稍亮）**：`rgba(20, 31, 53, 0.95)` 或 gradient
3. **分隔区（更亮）**：`#1E293B`

**定义位置**：
- CSS 变量：`app/globals.css` 的 `:root` 中
- TypeScript 配置：`lib/styles/default-theme.ts`

---

#### Visual Themes（可切换的视觉主题）

**标识**：`VisualThemeName = 'apple-white' | 'industrial-dark'`

**可切换主题列表**：
- `apple-white`：Apple White（苹果白）
- `industrial-dark`：Industrial Dark（深色工业）

**切换方式**：
- 通过 `ThemeProvider` 的 `setTheme` 函数
- 保存到 `localStorage`（键名：`ios-theme-preference`）
- 通过 `data-theme` 属性应用到 DOM

**限制规则**：
- ✅ 允许覆盖：颜色、字体、阴影、圆角
- ⛔ 禁止修改：布局结构、卡片高度、信息密度、模块拆分方式

---

### 1.4 主题切换机制

**实现位置**：`lib/styles/theme-context.tsx`

**核心流程**：

```typescript
1. 初始化（useEffect）：
   - 检查 localStorage 是否有保存的主题
   - 如果是首次访问（无保存主题），应用 DefaultTheme
   - 如果有保存主题，应用保存的主题

2. 切换主题（setTheme）：
   - 验证主题名称是否有效
   - 禁止切换到 DefaultTheme（只能通过清除 localStorage 恢复）
   - 保存到 localStorage
   - 更新 data-theme 属性
   - 注入 CSS 变量（通过内联 style 属性）

3. CSS 变量注入：
   - 通过 getVisualThemeCSSVariables 函数生成 CSS 变量字符串
   - 通过 document.documentElement.style.cssText 注入
   - 只注入视觉相关变量，不包含结构变量
```

**关键代码**：
```typescript
// 注入 CSS 变量
const root = document.documentElement
const themeConfig = VISUAL_THEMES[theme as VisualThemeName]
if (themeConfig) {
  root.setAttribute('data-theme', theme)
  root.style.cssText = getVisualThemeCSSVariables(themeConfig)
} else {
  // DefaultTheme：移除 data-theme 和 style
  root.removeAttribute('data-theme')
  root.removeAttribute('style')
}
```

---

## 二、CSS 变量系统

### 2.1 设计系统基础变量（不属于 Theme）

**文件位置**：`app/globals.css` 的 `:root` 中

**Spacing（间距）变量**：
```css
--spacing-xs: 0.25rem;    /* 4px */
--spacing-sm: 0.5rem;     /* 8px */
--spacing-md: 1rem;       /* 16px */
--spacing-lg: 1.5rem;     /* 24px */
--spacing-xl: 2rem;        /* 32px */
--spacing-2xl: 3rem;       /* 48px */
--spacing-3xl: 4rem;       /* 64px */
```

**Typography Scale（字体大小）变量**：
```css
--font-size-xs: 0.75rem;     /* 12px */
--font-size-sm: 0.875rem;    /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;    /* 18px */
--font-size-xl: 1.25rem;     /* 20px */
--font-size-2xl: 1.5rem;     /* 24px */
--font-size-3xl: 1.875rem;   /* 30px */
--font-size-4xl: 2.25rem;    /* 36px */
```

**Line Height（行高）变量**：
```css
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

**Z-Index Scale（层级）变量**：
```css
--z-index-dropdown: 1000;
--z-index-sticky: 1020;
--z-index-fixed: 1030;
--z-index-modal: 1040;
--z-index-popover: 1050;
--z-index-tooltip: 1060;
```

**说明**：
- 这些变量不属于 Theme 系统
- 供组件和布局使用，不随主题切换变化
- 部分行高变量在 `density.css` 中定义（受 `data-density` 属性影响）

---

### 2.2 DefaultTheme 视觉变量

**文件位置**：`app/globals.css` 的 `:root` 中

**背景色变量**：
```css
--background: #0A1628;              /* 深色背景（最暗层） */
--background-secondary: #0F1B2E;    /* 次要背景（稍亮，用于渐变） */
```

**卡片色变量**：
```css
--card: rgba(20, 31, 53, 0.95);      /* 卡片背景（稍亮层，轻微透明度） */
--card-foreground: #E5E8ED;         /* 卡片文字（高对比） */
--popover: rgba(20, 31, 53, 0.98);  /* 弹出层（更不透明） */
--popover-foreground: #E5E8ED;
```

**前景色变量**：
```css
--foreground: #E5E8ED;              /* 主文字（高对比） */
--foreground-secondary: #8B94A6;    /* 次要文字 */
```

**主色变量**：
```css
--primary: #3B82F6;                 /* 蓝色主色（高对比） */
--primary-foreground: #FFFFFF;
--primary-glow: color-mix(in srgb, var(--primary) 20%, transparent);
/* 主色光感（用于卡片下方光感效果） */
```

**次要色变量**：
```css
--secondary: #1E293B;               /* 次要背景（分隔区层，更亮） */
--secondary-foreground: #E5E8ED;
```

**强调色变量**：
```css
--accent: #60A5FA;                  /* 蓝色强调色 */
--accent-foreground: #FFFFFF;
```

**静音色变量**：
```css
--muted: #1E293B;                   /* 静音背景（与分隔区同层） */
--muted-foreground: #8B94A6;
```

**边框变量**：
```css
--border: #1E293B;                  /* 边框（分隔区层） */
--input: #1E293B;                   /* 输入框背景 */
--ring: #3B82F6;                    /* 焦点环 */
```

**状态色变量**：
```css
--destructive: #EF4444;             /* 红色（高对比） */
--destructive-foreground: #FFFFFF;
--success: #10B981;                 /* 绿色（高对比） */
--success-foreground: #FFFFFF;
--warning: #F59E0B;                 /* 橙色（高对比） */
--warning-foreground: #FFFFFF;
```

**毛玻璃效果变量**：
```css
--glass: rgba(20, 31, 53, 0.7);     /* 毛玻璃背景 */
--glass-border: rgba(59, 130, 246, 0.2); /* 毛玻璃边框 */
```

**圆角变量**：
```css
--radius-card: 0.25rem;             /* 4px - 最小圆角 */
--radius-button: 0.25rem;
--radius-input: 0.25rem;
--radius-small: 0.25rem;
--radius: 0.25rem;
```

**图表颜色变量**：
```css
--chart-1: #3B82F6;
--chart-2: #60A5FA;
--chart-3: #10B981;
--chart-4: #F59E0B;
--chart-5: #EF4444;
```

**侧边栏变量**：
```css
--sidebar: rgba(20, 31, 53, 0.95);
--sidebar-foreground: #E5E8ED;
--sidebar-primary: #3B82F6;
--sidebar-primary-foreground: #FFFFFF;
--sidebar-accent: #1E293B;
--sidebar-accent-foreground: #E5E8ED;
--sidebar-border: #1E293B;
--sidebar-ring: #3B82F6;
```

**字体族变量**：
```css
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
--font-mono: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace;
```

---

### 2.3 Visual Theme 变量覆盖

#### Apple White 主题

**作用域**：`.theme-apple`（限制在类作用域内，不覆盖 default 主题）

**颜色覆盖**：
```css
--background: #F2F2F7;              /* iOS系统背景色（更浅） */
--background-secondary: #FFFFFF;
--foreground: #1D1D1F;              /* SF Pro感深色文字（纯深黑） */
--foreground-secondary: #86868B;
--card: #FFFFFF;                    /* 纯白面板/卡片（更浅） */
--primary: #007AFF;                  /* iOS系统蓝色（更浅） */
--secondary: #F5F5F7;                /* 更浅的次要色 */
--border: #E5E5EA;                   /* 极淡边框（更浅） */
```

**圆角覆盖**：
```css
--radius-card: 1.5rem;              /* 24px - 更大圆角（Squircle感） */
--radius-button: 1.5rem;
--radius-input: 1.5rem;
```

**字体覆盖**：
```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "SF Pro Display", "SF Pro Text", sans-serif;
```

**阴影覆盖**：
```css
/* 更柔和的阴影 */
--theme-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
```

---

#### Industrial Dark 主题

**作用域**：`[data-theme="industrial-dark"]`

**颜色覆盖**：
```css
--background: #0A1628;              /* 深色背景（非纯黑，偏蓝灰） */
--background-secondary: #0F1B2E;
--card: rgba(20, 31, 53, 0.95);     /* 卡片背景（轻微透明度） */
--foreground: #E5E8ED;              /* 主文字（高对比） */
--primary: #3B82F6;                 /* 蓝色主色（高对比） */
```

**圆角覆盖**：
```css
--radius-card: 0.25rem;             /* 4px - 最小圆角 */
```

**字体覆盖**：
```css
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

---

## 三、卡片效果层系统

### 3.1 卡片效果实现

**文件位置**：`components/ui/card.tsx`

**实现方式**：
- 使用 `data-card-effect` 属性控制效果类型
- 通过 `::after` 伪元素实现，不影响布局
- 不属于 Theme 系统，通过 CSS 类实现

**效果类型**：
- `glow-soft`：柔和霓虹底光感（蓝色渐变 + 模糊）

**CSS 实现**（`app/globals.css`）：
```css
[data-slot="card"] {
  position: relative;
}

[data-card-effect="glow-soft"]::after {
  content: '';
  position: absolute;
  inset: -6px;
  background: radial-gradient(
    ellipse at bottom,
    rgba(96,165,250,0.35),
    transparent 60%
  );
  filter: blur(14px);
  z-index: -1;
  pointer-events: none;
  border-radius: inherit;
}
```

**使用方式**：
```tsx
<Card cardEffect="glow-soft">
  {/* 卡片内容 */}
</Card>
```

**设计原则**：
- ✅ 不影响布局（使用 `position: absolute` + `z-index: -1`）
- ✅ 不进入 Theme（通过 `data-card-effect` 属性控制）
- ✅ 不破坏 DefaultTheme（效果独立于主题）
- ✅ 完全符合系统的"职责边界"

---

### 3.2 卡片下方光感效果

**DefaultTheme 卡片光感**（`app/globals.css`）：
```css
:root:not([data-theme="apple-white"]):not([data-theme="industrial-dark"]) .theme-card {
  --theme-glow: 0 8px 32px -4px var(--primary-glow), 
                0 4px 16px -2px var(--primary-glow);
  box-shadow: var(--theme-shadow), var(--theme-glow);
}
```

**实现方式**：
- 使用 `--primary-glow` CSS 变量（绑定主题主色）
- 通过 `box-shadow` 实现柔和下发光
- 使用 `blur` 扩散效果
- 光色与主题主色绑定（`color-mix`）

---

**文档第一部分结束，请继续查看第二部分**
