# 3. 全局样式与主题底层 (Theme & Style Engine) - 第二部分

**生成时间**：2025-01-20  
**文档版本**：v1.0

---

## 四、信息密度系统（Density）

### 4.1 Density 系统架构

**文件位置**：`lib/styles/base/density.css`

**核心原则**：
- Density 只影响空间和行高，不影响视觉风格
- 三个密度等级：`compact`（工人端）、`normal`（用户端，默认）、`dense`（管理端）
- 使用 CSS 变量形式，便于统一管理和切换

**应用方式**：
- 通过 `data-density` 属性应用到 DOM 元素
- 例如：`<div data-density="compact">...</div>`

---

### 4.2 Density 等级定义

#### Compact（工人端）

**应用场景**：移动端、触摸操作、工人端页面

**特点**：
- 最紧凑的布局
- 减少 padding 和 gap，提高信息密度
- 适合小屏幕和快速操作

**关键变量**：
```css
--space-card-padding: 0.75rem;        /* 12px */
--space-gap-card: 0.5rem;             /* 8px */
--line-height-base: 1.375;             /* 22px / 16px */
--space-table-row-height: 2rem;       /* 32px */
```

---

#### Normal（用户端，默认）

**应用场景**：大多数用户场景、客户端页面

**特点**：
- 平衡的布局
- 标准的 padding 和 gap，舒适的阅读体验
- 默认密度等级

**关键变量**：
```css
--space-card-padding: 1rem;           /* 16px */
--space-gap-card: 0.75rem;            /* 12px */
--line-height-base: 1.5;               /* 24px / 16px */
--space-table-row-height: 2.5rem;     /* 40px */
```

---

#### Dense（管理端）

**应用场景**：数据展示、管理界面、桌面端

**特点**：
- 最密集的布局
- 最大化信息密度
- 适合桌面端和鼠标操作

**关键变量**：
```css
--space-card-padding: 0.5rem;         /* 8px */
--space-gap-card: 0.375rem;           /* 6px */
--line-height-base: 1.25;              /* 20px / 16px */
--space-table-row-height: 1.75rem;    /* 28px */
```

---

### 4.3 Density 变量分类

**Padding（内边距）变量**：
- `--space-card-padding`：卡片内边距
- `--space-card-padding-y`：卡片垂直内边距
- `--space-card-padding-x`：卡片水平内边距
- `--space-section-padding`：区块内边距
- `--space-item-padding`：列表项内边距
- `--space-button-padding-y`：按钮垂直内边距
- `--space-button-padding-x`：按钮水平内边距
- `--space-input-padding-y`：输入框垂直内边距
- `--space-input-padding-x`：输入框水平内边距

**Gap（间距）变量**：
- `--space-gap-xs`：极小间距（4px / 4px / 2px）
- `--space-gap-sm`：小间距（6px / 8px / 4px）
- `--space-gap-md`：中等间距（8px / 12px / 6px）
- `--space-gap-lg`：大间距（12px / 16px / 8px）
- `--space-gap-xl`：超大间距（16px / 24px / 12px）
- `--space-gap-card`：卡片内部间距
- `--space-gap-section`：区块间距
- `--space-gap-list`：列表项间距
- `--space-gap-form`：表单字段间距

**Line Height（行高）变量**：
- `--line-height-base`：基础行高
- `--line-height-tight`：紧凑行高
- `--line-height-normal`：正常行高
- `--line-height-relaxed`：宽松行高
- `--line-height-heading`：标题行高
- `--line-height-body`：正文行高
- `--line-height-caption`：说明文字行高

**Table（表格）变量**：
- `--space-table-cell-padding-y`：表格单元格垂直内边距
- `--space-table-cell-padding-x`：表格单元格水平内边距
- `--space-table-row-height`：表格行高
- `--space-table-header-height`：表格表头行高
- `--space-table-gap`：表格列间距

**Card（卡片）变量**：
- `--space-card-internal`：卡片内部元素间距
- `--space-card-header-padding`：卡片头部内边距
- `--space-card-body-padding`：卡片主体内边距
- `--space-card-footer-padding`：卡片底部内边距
- `--space-card-gap`：卡片内部元素间距

---

## 五、组件库实现

### 5.1 Card 组件

**文件位置**：`components/ui/card.tsx`

**实现方式**：
- 使用 Tailwind CSS 工具类
- 通过 CSS 变量控制样式
- 支持 `cardEffect` 属性（效果层）

**核心样式**：
```tsx
<div
  data-slot="card"
  data-card-effect={cardEffect || undefined}
  className="bg-card text-card-foreground flex flex-col border shadow-sm"
  style={{
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-card-padding-y, 1rem) var(--space-card-padding-x, 1rem)',
    gap: 'var(--space-gap-card, 0.75rem)',
  }}
>
  {/* 卡片内容 */}
</div>
```

**背景色来源**：
- `bg-card`：Tailwind 类，映射到 `var(--card)` CSS 变量
- 变量值由主题系统控制（DefaultTheme 或 Visual Theme）

**阴影来源**：
- `shadow-sm`：Tailwind 工具类
- `var(--theme-shadow)`：主题阴影变量（在 `globals.css` 中定义）

**圆角来源**：
- `borderRadius: 'var(--radius-card)'`：主题圆角变量

**子组件**：
- `CardHeader`：卡片头部
- `CardTitle`：卡片标题
- `CardDescription`：卡片描述
- `CardContent`：卡片内容
- `CardFooter`：卡片底部
- `CardAction`：卡片操作按钮

---

### 5.2 Button 组件

**文件位置**：`components/ui/button.tsx`

**实现方式**：
- 使用 `class-variance-authority`（CVA）管理变体
- 使用 Tailwind CSS 工具类
- 通过 CSS 变量控制圆角

**变体类型**：
- `default`：默认按钮（主色背景）
- `destructive`：危险按钮（红色背景）
- `outline`：轮廓按钮（边框样式）
- `secondary`：次要按钮（次要色背景）
- `ghost`：幽灵按钮（无背景）
- `link`：链接按钮（文本样式）

**尺寸类型**：
- `default`：默认尺寸（h-9）
- `sm`：小尺寸（h-8）
- `lg`：大尺寸（h-10）
- `icon`：图标按钮（size-9）
- `icon-sm`：小图标按钮（size-8）
- `icon-lg`：大图标按钮（size-10）

**核心样式**：
```tsx
<button
  data-slot="button"
  className={cn(buttonVariants({ variant, size, className }))}
  style={{ borderRadius: 'var(--radius-button)' }}
>
  {/* 按钮内容 */}
</button>
```

**颜色来源**：
- 通过 Tailwind 类映射到主题 CSS 变量
- 例如：`bg-primary` → `var(--primary)`

---

### 5.3 Input 组件

**文件位置**：`components/ui/input.tsx`

**实现方式**：
- 使用 Tailwind CSS 工具类
- 通过 CSS 变量控制样式

**核心样式**：
```tsx
<input
  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
  style={{
    borderRadius: 'var(--radius-input)',
  }}
/>
```

**样式来源**：
- `border-input`：边框颜色（`var(--input)`）
- `bg-background`：背景色（`var(--background)`）
- `text-muted-foreground`：占位符颜色（`var(--muted-foreground)`）
- `ring-ring`：焦点环颜色（`var(--ring)`）

---

### 5.4 Dialog 组件

**文件位置**：`components/ui/dialog.tsx`

**实现方式**：
- 基于 Radix UI 的 Dialog 组件
- 使用 Tailwind CSS 工具类
- 通过 CSS 变量控制样式

**核心样式**：
```tsx
<DialogContent
  className="bg-popover text-popover-foreground"
  style={{
    borderRadius: 'var(--radius-card)',
  }}
>
  {/* 对话框内容 */}
</DialogContent>
```

**背景色来源**：
- `bg-popover`：弹出层背景（`var(--popover)`）
- `text-popover-foreground`：弹出层文字（`var(--popover-foreground)`）

---

### 5.5 组件响应主题切换

**响应机制**：
1. **CSS 变量自动更新**：
   - 主题切换时，`ThemeProvider` 更新 `document.documentElement.style.cssText`
   - 所有使用 CSS 变量的组件自动响应

2. **Tailwind 类映射**：
   - Tailwind 工具类（如 `bg-card`、`text-foreground`）映射到 CSS 变量
   - 主题切换时，变量值变化，组件样式自动更新

3. **内联样式**：
   - 部分组件使用 `style` 属性直接引用 CSS 变量
   - 例如：`borderRadius: 'var(--radius-card)'`

**示例**：
```tsx
// Card 组件
<div className="bg-card text-card-foreground">
  {/* bg-card 映射到 var(--card) */}
  {/* text-card-foreground 映射到 var(--card-foreground) */}
</div>

// Button 组件
<button className="bg-primary text-primary-foreground">
  {/* bg-primary 映射到 var(--primary) */}
  {/* text-primary-foreground 映射到 var(--primary-foreground) */}
</button>
```

---

## 六、布局组件系统

### 6.1 BaseLayout（基础布局）

**文件位置**：`components/layout/BaseLayout.tsx`

**职责**：
- 提供基础页面布局结构
- 定义容器宽度、侧边栏宽度、头部高度、页脚高度
- 管理布局相关的 CSS 变量

**布局变量**：
```typescript
export const LAYOUT_VARS = {
  containerMaxWidth: '1280px',
  sidebarWidth: '256px',
  headerHeight: '64px',
  footerHeight: '80px',
} as const
```

**使用方式**：
```tsx
<BaseLayout maxWidth="1280px" centered={true}>
  {/* 页面内容 */}
</BaseLayout>
```

**说明**：
- 布局结构不属于 Theme 系统
- Theme 只控制视觉样式（颜色、字体、阴影、圆角）
- 布局结构通过组件控制，不通过 Theme 控制

---

### 6.2 DashboardLayout（仪表板布局）

**文件位置**：`components/layout/DashboardLayout.tsx`

**职责**：
- 提供仪表板专用布局结构（侧边栏 + 主内容区）
- 管理 Grid / Flex 布局方向
- 定义侧边栏宽度、主内容区宽度

**布局方向**：
- **横向布局**（Grid）：侧边栏 + 主内容区（`showSidebar={true}`）
- **纵向布局**（Flex）：仅主内容区（`showSidebar={false}`）

**使用方式**：
```tsx
<DashboardLayout
  sidebar={<Sidebar />}
  sidebarWidth="256px"
  showSidebar={true}
>
  {/* 主内容 */}
</DashboardLayout>
```

**说明**：
- Grid / Flex 方向不属于 Theme 系统
- 布局结构通过组件控制，不通过 Theme 控制

---

### 6.3 CardSkeleton（卡片骨架屏）

**文件位置**：`components/ui/CardSkeleton.tsx`

**职责**：
- 定义卡片信息层级结构（标题 / 主数值 / 辅助说明）
- 控制信息显示顺序
- 提供卡片骨架屏的布局结构

**信息层级**（从上到下）：
1. **标题（Title）**：顶部，较小字号
2. **主数值（Main Value）**：中间，较大字号
3. **辅助说明（Description）**：底部，最小字号

**层级常量**：
```typescript
export const CARD_HIERARCHY = {
  order: ['title', 'mainValue', 'description'] as const,
  title: {
    fontSize: 'var(--font-size-base, 1rem)',
    lineHeight: 'var(--line-height-normal, 1.5)',
    fontWeight: '600',
  },
  mainValue: {
    fontSize: 'var(--font-size-2xl, 1.5rem)',
    lineHeight: 'var(--line-height-tight, 1.25)',
    fontWeight: '700',
  },
  description: {
    fontSize: 'var(--font-size-sm, 0.875rem)',
    lineHeight: 'var(--line-height-normal, 1.5)',
    fontWeight: '400',
  },
} as const
```

**使用方式**：
```tsx
<CardSkeleton
  showTitle={true}
  showMainValue={true}
  showDescription={true}
  titleWidth="60%"
  mainValueWidth="40%"
  descriptionLines={2}
/>
```

**说明**：
- 卡片信息层级不属于 Theme 系统
- Theme 只控制视觉样式（颜色、字体、阴影、圆角）
- 信息层级通过组件控制，不通过 Theme 控制

---

## 七、主题切换 UI

### 7.1 主题选择页面

**文件位置**：`app/themes/page.tsx`

**功能**：
- 显示所有可用主题（DefaultTheme + Visual Themes）
- 允许用户选择主题
- 显示当前激活的主题（勾选标记）

**可用主题**：
- `DefaultTheme`：默认主题（不可删除、不可关闭）
- `Apple White`：苹果白主题
- `Industrial Dark`：深色工业主题

**切换流程**：
1. 用户点击主题卡片
2. 调用 `setTheme(themeName)`
3. 保存到 `localStorage`
4. 更新 `data-theme` 属性
5. 注入 CSS 变量
6. 导航回上一页

---

### 7.2 主题切换按钮

**文件位置**：`components/theme-switcher.tsx`

**功能**：
- 显示当前主题的显示名称
- 点击后导航到 `/themes` 页面

**实现方式**：
```tsx
<Button onClick={() => router.push('/themes')}>
  更多主题
</Button>
```

**使用位置**：
- `app/settings/page.tsx`：设置页面
- `components/profile-content.tsx`：个人资料页面

---

## 八、阴影系统

### 8.1 主题阴影变量

**DefaultTheme 阴影**：
```css
--theme-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 
                0 1px 2px -1px rgba(0, 0, 0, 0.1);
```

**Apple White 阴影**：
```css
--theme-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
/* 更柔和的阴影 */
```

**Industrial Dark 阴影**：
```css
--theme-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
/* 深色主题的阴影（保持层次感） */
```

---

### 8.2 卡片阴影增强

**DefaultTheme 卡片光感**：
```css
:root:not([data-theme="apple-white"]):not([data-theme="industrial-dark"]) .theme-card {
  --theme-glow: 0 8px 32px -4px var(--primary-glow), 
                0 4px 16px -2px var(--primary-glow);
  box-shadow: var(--theme-shadow), var(--theme-glow);
}
```

**实现方式**：
- 使用 `--primary-glow` 变量（绑定主题主色）
- 通过 `box-shadow` 实现柔和下发光
- 使用 `blur` 扩散效果
- 光色与主题主色绑定（`color-mix`）

---

## 九、字体系统

### 9.1 字体族变量

**DefaultTheme 字体**：
```css
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
--font-mono: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace;
```

**Apple White 字体**：
```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "SF Pro Display", "SF Pro Text", sans-serif;
/* SF 系字体 */
```

**Industrial Dark 字体**：
```css
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
/* 标准系统字体（与 DefaultTheme 一致） */
```

---

### 9.2 字体大小变量（不属于 Theme）

**字体大小变量**（设计系统基础变量）：
```css
--font-size-xs: 0.75rem;     /* 12px */
--font-size-sm: 0.875rem;    /* 14px */
--font-size-base: 1rem;      /* 16px */
--font-size-lg: 1.125rem;    /* 18px */
--font-size-xl: 1.25rem;     /* 20px */
--font-size-2xl: 1.5rem;     /* 24px */
--font-size-3xl: 1.875rem;   /* 30px */
--font-size-4xl: 2.25rem;    /* 36px */
```

**说明**：
- 字体大小不属于 Theme 系统
- Theme 只控制字体家族（font-family），不控制字体大小
- 字体大小是设计系统的基础变量，供组件使用

---

## 十、主题系统文件结构

### 10.1 核心文件

```
lib/styles/
├── themes.ts                    # 主题配置定义
├── default-theme.ts             # DefaultTheme 完整定义
├── theme-context.tsx            # ThemeProvider 和 Context
└── base/
    └── density.css              # 信息密度系统
```

### 10.2 样式文件

```
app/
└── globals.css                  # 全局样式、Base Theme、Visual Themes
```

### 10.3 组件文件

```
components/
├── ui/
│   ├── card.tsx                 # Card 组件（支持 cardEffect）
│   ├── button.tsx               # Button 组件
│   ├── input.tsx                # Input 组件
│   └── CardSkeleton.tsx         # 卡片骨架屏（信息层级）
└── layout/
    ├── BaseLayout.tsx           # 基础布局组件
    └── DashboardLayout.tsx      # 仪表板布局组件
```

---

## 十一、主题切换流程

### 11.1 初始化流程

```
1. 页面加载
   ↓
2. ThemeProvider 初始化（useEffect）
   ↓
3. 检查 localStorage（THEME_STORAGE_KEY）
   ↓
4. 如果是首次访问（无保存主题）
   → 应用 DefaultTheme（移除 data-theme 和 style）
   ↓
5. 如果有保存主题
   → 验证主题名称是否有效
   → 应用保存的主题（设置 data-theme 和注入 CSS 变量）
```

---

### 11.2 切换流程

```
1. 用户点击主题选择
   ↓
2. 调用 setTheme(themeName)
   ↓
3. 验证主题名称
   - 禁止切换到 DefaultTheme
   - 验证是否为有效的 VisualThemeName
   ↓
4. 保存到 localStorage
   ↓
5. 更新 DOM
   - 设置 data-theme 属性
   - 注入 CSS 变量（通过 style.cssText）
   ↓
6. 触发重新渲染
   - 所有使用 CSS 变量的组件自动更新
```

---

## 十二、主题系统限制规则

### 12.1 Visual Theme 限制

**✅ 允许覆盖**：
- 颜色（colors）- 只改变颜色值，不改变语义
- 字体（font-family）- 只改变字体家族，不改变字体大小
- 阴影（shadows）- 只改变阴影样式，不改变布局结构
- 圆角（border-radius）- 只改变圆角大小，不改变卡片高度

**⛔ 严格禁止**：
- 严禁修改布局结构（Grid / Flex 方向）
- 严禁修改卡片信息层级（标题 / 主数值 / 辅助说明）
- 严禁修改组件密度（padding / gap）
- 严禁修改信息显示顺序
- 严禁修改字体大小（font-size）
- 严禁修改行高（line-height）
- 严禁修改间距（spacing）
- 严禁修改层级（z-index）
- 严禁修改卡片高度（card height）
- 严禁修改数据字号层级（font-size hierarchy）
- 严禁修改模块拆分方式（module structure）

**核心原则**：
- 确保同一页面在 DefaultTheme 与 Visual Theme 下，信息数量与位置完全一致
- 只改变视觉样式，不改变布局结构

---

### 12.2 Density 系统限制

**✅ 允许影响**：
- padding（内边距）
- gap（间距）
- line-height（行高）
- 表格行高（table row height）
- 卡片内部间距（card internal spacing）

**⛔ 严格禁止**：
- 颜色（color、background-color、border-color）
- 字体家族（font-family）
- 字体粗细（font-weight）
- 圆角视觉风格（border-radius）
- 边框样式（border-style、border-width）
- 阴影（box-shadow、text-shadow）

---

**文档第二部分结束**

**完整文档包含两部分**：
- `docs/3-theme-style-engine-part1.md`：主题系统架构、CSS 变量系统、卡片效果层
- `docs/3-theme-style-engine-part2.md`：信息密度系统、组件库实现、布局组件、主题切换流程
