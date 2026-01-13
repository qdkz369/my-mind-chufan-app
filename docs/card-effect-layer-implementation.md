# Card Effect Layer 实现说明

## 实现概述

为 Card 组件添加"霓虹底光感"效果，使用 `::after` 伪元素和 `data-card-effect` 属性控制，**完全独立于 Theme 系统**。

---

## 1. Card 组件修改

### 文件：`components/ui/card.tsx`

**修改内容**：
```typescript
interface CardProps extends React.ComponentProps<'div'> {
  /**
   * 卡片效果类型
   * - 'glow-soft': 柔和霓虹底光感（蓝色渐变 + 模糊）
   * - 不设置则不显示效果
   * 
   * ⚠️ 重要：
   * - 此属性不属于 Theme 系统
   * - 通过 data-card-effect 属性控制
   * - 使用 ::after 伪元素实现，不影响布局
   */
  cardEffect?: 'glow-soft' | null
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, cardEffect, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="card"
        data-card-effect={cardEffect || undefined}
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

**关键点**：
- ✅ **添加 `cardEffect` prop**：可选属性，类型为 `'glow-soft' | null`
- ✅ **设置 `data-card-effect` 属性**：通过 HTML 属性控制效果
- ✅ **不破坏现有结构**：所有现有功能保持不变

---

## 2. CSS 样式实现

### 文件：`app/globals.css`

**添加的样式**：
```css
/* ========================================
 * Card Effect Layer（卡片效果层）
 * 
 * ⚠️ 重要：此部分不属于 Theme 系统
 * - 通过 data-card-effect 属性控制
 * - 使用 ::after 伪元素实现
 * - 不影响布局（position: absolute, z-index: -1）
 * - 不破坏 DefaultTheme
 * ======================================== */

/* Card 基础定位（支持效果层） */
[data-slot="card"] {
  position: relative;
}

/* 柔和霓虹底光感效果 */
[data-slot="card"][data-card-effect="glow-soft"]::after {
  content: '';
  position: absolute;
  inset: -6px;
  background: radial-gradient(
    ellipse at bottom,
    rgba(96, 165, 250, 0.35),
    transparent 60%
  );
  filter: blur(14px);
  z-index: -1;
  pointer-events: none;
  border-radius: inherit;
}
```

**关键点**：
- ✅ **使用 `::after` 伪元素**：不增加 DOM 节点，更干净
- ✅ **`position: relative`**：Card 元素需要相对定位，以便效果层定位
- ✅ **`position: absolute`**：效果层绝对定位，不影响布局
- ✅ **`z-index: -1`**：效果层在 Card 内容下方
- ✅ **`inset: -6px`**：效果层比 Card 大 6px，形成外发光效果
- ✅ **`pointer-events: none`**：效果层不拦截鼠标事件
- ✅ **`border-radius: inherit`**：继承 Card 的圆角

---

## 3. 使用方式

### 方式一：通过 Card 组件的 prop

```tsx
import { Card } from '@/components/ui/card'

// 启用柔和霓虹底光感效果
<Card cardEffect="glow-soft">
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>内容</CardContent>
</Card>

// 不启用效果（默认）
<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>内容</CardContent>
</Card>
```

### 方式二：直接设置 data-card-effect 属性

```tsx
// 如果使用其他组件或直接使用 div
<div data-slot="card" data-card-effect="glow-soft" className="theme-card">
  内容
</div>
```

---

## 4. 效果说明

### glow-soft（柔和霓虹底光感）

**视觉效果**：
- 蓝色渐变光晕从卡片底部向上扩散
- 使用 `radial-gradient` 创建椭圆形渐变
- 使用 `filter: blur(14px)` 创建柔和模糊效果
- 光晕颜色：`rgba(96, 165, 250, 0.35)`（蓝色，35% 透明度）

**技术实现**：
```css
background: radial-gradient(
  ellipse at bottom,           /* 椭圆形，从底部开始 */
  rgba(96, 165, 250, 0.35),   /* 中心颜色：蓝色，35% 透明度 */
  transparent 60%              /* 60% 位置变为透明 */
);
filter: blur(14px);            /* 14px 模糊 */
```

---

## 5. 设计原则验证

### ✅ 不影响布局
- **原因**：使用 `position: absolute` 和 `z-index: -1`，效果层脱离文档流
- **验证**：Card 的尺寸、位置、padding、gap 都不受影响

### ✅ 不进入 Theme 系统
- **原因**：通过 `data-card-effect` 属性控制，不是 CSS 变量
- **验证**：切换主题时，效果层样式不变（如果需要主题相关效果，可以扩展）

### ✅ 不破坏 DefaultTheme
- **原因**：效果层是独立的 CSS 规则，不修改 Theme 相关的样式
- **验证**：DefaultTheme 的所有样式保持不变

### ✅ 完全符合职责边界
- **原因**：
  - Theme 系统只控制：颜色、字体、阴影、圆角
  - Effect Layer 是视觉效果增强，不属于 Theme 系统
  - 通过 data-attribute 控制，符合组件职责边界

---

## 6. 扩展性

### 添加更多效果类型

如果需要添加更多效果，只需：

1. **扩展 CardProps 接口**：
```typescript
interface CardProps extends React.ComponentProps<'div'> {
  cardEffect?: 'glow-soft' | 'glow-strong' | 'pulse' | null
}
```

2. **添加对应的 CSS**：
```css
[data-slot="card"][data-card-effect="glow-strong"]::after {
  /* 更强的光晕效果 */
  background: radial-gradient(
    ellipse at bottom,
    rgba(96, 165, 250, 0.6),
    transparent 50%
  );
  filter: blur(20px);
}

[data-slot="card"][data-card-effect="pulse"]::after {
  /* 脉冲效果 */
  animation: pulse-glow 2s ease-in-out infinite;
}
```

---

## 7. 性能考虑

### 优化点

1. **GPU 加速**：
   - `filter: blur()` 会触发 GPU 加速
   - 对于大量卡片，可能需要考虑性能影响

2. **选择性使用**：
   - 建议只在重要卡片上使用效果
   - 避免在所有卡片上同时使用

3. **降级处理**：
   - 如果浏览器不支持 `filter`，效果层会显示但不模糊
   - 可以通过 `@supports` 查询进行降级

---

## 8. 完整代码

### Card 组件（完整）

```typescript
import * as React from 'react'

import { cn } from '@/lib/utils'

interface CardProps extends React.ComponentProps<'div'> {
  /**
   * 卡片效果类型
   * - 'glow-soft': 柔和霓虹底光感（蓝色渐变 + 模糊）
   * - 不设置则不显示效果
   * 
   * ⚠️ 重要：
   * - 此属性不属于 Theme 系统
   * - 通过 data-card-effect 属性控制
   * - 使用 ::after 伪元素实现，不影响布局
   */
  cardEffect?: 'glow-soft' | null
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, cardEffect, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="card"
        data-card-effect={cardEffect || undefined}
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

### CSS 样式（完整）

```css
/* Card 基础定位（支持效果层） */
[data-slot="card"] {
  position: relative;
}

/* 柔和霓虹底光感效果 */
[data-slot="card"][data-card-effect="glow-soft"]::after {
  content: '';
  position: absolute;
  inset: -6px;
  background: radial-gradient(
    ellipse at bottom,
    rgba(96, 165, 250, 0.35),
    transparent 60%
  );
  filter: blur(14px);
  z-index: -1;
  pointer-events: none;
  border-radius: inherit;
}
```

---

## 9. 测试验证

### 验证步骤

1. **布局测试**：
   - 使用 `cardEffect="glow-soft"` 的 Card 和普通 Card 并排显示
   - 确认两者尺寸、位置完全一致

2. **主题切换测试**：
   - 在不同主题下使用 `cardEffect="glow-soft"`
   - 确认效果层样式不变（符合设计：不属于 Theme）

3. **性能测试**：
   - 在页面上使用多个带效果的 Card
   - 确认页面滚动、交互流畅

---

## 总结

### 实现特点

- ✅ **使用 `::after` 伪元素**：不增加 DOM 节点
- ✅ **通过 `data-card-effect` 属性控制**：不属于 Theme 系统
- ✅ **不影响布局**：`position: absolute` + `z-index: -1`
- ✅ **不破坏现有结构**：Card 组件向后兼容
- ✅ **符合职责边界**：Effect Layer 独立于 Theme 系统

### 使用示例

```tsx
// 启用效果
<Card cardEffect="glow-soft">
  内容
</Card>

// 不启用效果（默认）
<Card>
  内容
</Card>
```

### 视觉效果

- **柔和蓝色光晕**：从卡片底部向上扩散
- **模糊效果**：14px 模糊，创建柔和感
- **不遮挡内容**：`z-index: -1` 确保内容在上层
