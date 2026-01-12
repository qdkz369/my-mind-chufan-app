# UI Density（信息密度）规范文档

## 完成时间
2025-01-20

## 文件位置
`lib/styles/base/density.css`

## 核心原则

### ✅ Density 允许影响

1. **padding**（内边距）
   - 卡片内边距
   - 区块内边距
   - 列表项内边距
   - 按钮内边距
   - 输入框内边距
   - 表单内边距

2. **gap**（间距）
   - 卡片内部间距
   - 区块间距
   - 列表项间距
   - 表单字段间距
   - 按钮组间距

3. **line-height**（行高）
   - 基础行高
   - 紧凑行高
   - 正常行高
   - 宽松行高
   - 标题行高
   - 正文行高
   - 说明文字行高

4. **表格行高**（table row height）
   - 表格单元格内边距
   - 表格行高
   - 表格表头行高
   - 表格列间距

5. **卡片内部间距**（card internal spacing）
   - 卡片头部内边距
   - 卡片主体内边距
   - 卡片底部内边距
   - 卡片内部元素间距

### ⛔ Density 禁止影响

1. **颜色**
   - `color`
   - `background-color`
   - `border-color`

2. **字体家族**
   - `font-family`

3. **字体粗细**
   - `font-weight`

4. **圆角视觉风格**
   - `border-radius`

5. **边框样式**
   - `border-style`
   - `border-width`

6. **阴影**
   - `box-shadow`
   - `text-shadow`

## 三个密度等级

### 1. Compact（工人端）

**选择器**：`[data-density="compact"]`

**特点**：
- 最紧凑的布局
- 适合移动端和触摸操作
- 减少 padding 和 gap，提高信息密度

**示例值**：
- `--space-card-padding: 0.75rem` (12px)
- `--space-gap-md: 0.5rem` (8px)
- `--line-height-base: 1.375` (22px / 16px)
- `--space-table-row-height: 2rem` (32px)

### 2. Normal（用户端，默认）

**选择器**：`:root` 或 `[data-density="normal"]`

**特点**：
- 平衡的布局
- 适合大多数用户场景
- 标准的 padding 和 gap，舒适的阅读体验

**示例值**：
- `--space-card-padding: 1rem` (16px)
- `--space-gap-md: 0.75rem` (12px)
- `--line-height-base: 1.5` (24px / 16px)
- `--space-table-row-height: 2.5rem` (40px)

### 3. Dense（管理端）

**选择器**：`[data-density="dense"]`

**特点**：
- 最密集的布局
- 适合数据展示和管理界面
- 最大化信息密度，适合桌面端和鼠标操作

**示例值**：
- `--space-card-padding: 0.5rem` (8px)
- `--space-gap-md: 0.375rem` (6px)
- `--line-height-base: 1.25` (20px / 16px)
- `--space-table-row-height: 1.75rem` (28px)

## CSS 变量命名规范

### Padding（内边距）
- `--space-card-padding` - 卡片内边距
- `--space-card-padding-y` - 卡片垂直内边距
- `--space-card-padding-x` - 卡片水平内边距
- `--space-section-padding` - 区块内边距
- `--space-section-padding-y` - 区块垂直内边距
- `--space-section-padding-x` - 区块水平内边距
- `--space-item-padding` - 列表项内边距
- `--space-item-padding-y` - 列表项垂直内边距
- `--space-item-padding-x` - 列表项水平内边距
- `--space-button-padding-y` - 按钮垂直内边距
- `--space-button-padding-x` - 按钮水平内边距
- `--space-input-padding-y` - 输入框垂直内边距
- `--space-input-padding-x` - 输入框水平内边距
- `--space-form-padding` - 表单内边距
- `--space-form-group-gap` - 表单组间距

### Gap（间距）
- `--space-gap-xs` - 极小间距
- `--space-gap-sm` - 小间距
- `--space-gap-md` - 中等间距
- `--space-gap-lg` - 大间距
- `--space-gap-xl` - 超大间距
- `--space-gap-card` - 卡片内部间距
- `--space-gap-section` - 区块间距
- `--space-gap-list` - 列表项间距
- `--space-gap-form` - 表单字段间距
- `--space-gap-button-group` - 按钮组间距

### Line Height（行高）
- `--line-height-base` - 基础行高
- `--line-height-tight` - 紧凑行高
- `--line-height-normal` - 正常行高
- `--line-height-relaxed` - 宽松行高
- `--line-height-heading` - 标题行高
- `--line-height-body` - 正文行高
- `--line-height-caption` - 说明文字行高

### Table（表格）
- `--space-table-cell-padding-y` - 表格单元格垂直内边距
- `--space-table-cell-padding-x` - 表格单元格水平内边距
- `--space-table-row-height` - 表格行高
- `--space-table-header-height` - 表格表头行高
- `--space-table-gap` - 表格列间距

### Card（卡片）
- `--space-card-internal` - 卡片内部元素间距
- `--space-card-header-padding` - 卡片头部内边距
- `--space-card-body-padding` - 卡片主体内边距
- `--space-card-footer-padding` - 卡片底部内边距
- `--space-card-gap` - 卡片内部元素间距

## 使用示例

### 在 CSS 中使用

```css
.my-card {
  padding: var(--space-card-padding);
  gap: var(--space-gap-card);
  line-height: var(--line-height-body);
}

.my-table-row {
  height: var(--space-table-row-height);
  padding: var(--space-table-cell-padding-y) var(--space-table-cell-padding-x);
}
```

### 在 JavaScript/TypeScript 中应用

```typescript
// 设置密度等级
document.documentElement.setAttribute('data-density', 'compact')  // 工人端
document.documentElement.setAttribute('data-density', 'normal')   // 用户端（默认）
document.documentElement.setAttribute('data-density', 'dense')    // 管理端
```

### 在 React 组件中使用

```tsx
import { useEffect } from 'react'

function WorkerPage() {
  useEffect(() => {
    document.documentElement.setAttribute('data-density', 'compact')
    return () => {
      document.documentElement.setAttribute('data-density', 'normal')
    }
  }, [])
  
  return <div>工人端页面</div>
}
```

## 验证清单

### ✅ 达标检查

- [x] `density.css` 只出现空间 / 行高
- [x] 没有任何颜色 / border / shadow
- [x] 定义了三个密度等级：compact、normal、dense
- [x] 所有变量都有清晰的注释说明
- [x] 使用 CSS 变量形式（`--space-*`、`--line-height-*`）

### ✅ 禁止事项验证

- [x] 没有 `color`、`background-color`、`border-color`
- [x] 没有 `font-family`
- [x] 没有 `font-weight`
- [x] 没有 `border-radius`
- [x] 没有 `border-style`、`border-width`
- [x] 没有 `box-shadow`、`text-shadow`

## 文件统计

- **总变量数**：126 个 CSS 变量
- **密度等级**：3 个（compact、normal、dense）
- **变量类别**：
  - Padding：14 个变量 × 3 个密度 = 42 个
  - Gap：10 个变量 × 3 个密度 = 30 个
  - Line Height：7 个变量 × 3 个密度 = 21 个
  - Table：5 个变量 × 3 个密度 = 15 个
  - Card：5 个变量 × 3 个密度 = 15 个

## 总结

UI Density 规范已成功创建，符合所有要求：

1. ✅ 文件位置：`lib/styles/base/density.css`
2. ✅ 定义了三个密度等级：compact（工人端）、normal（用户端，默认）、dense（管理端）
3. ✅ 只影响空间和行高，不影响视觉风格
4. ✅ 使用 CSS 变量形式，便于统一管理和切换
5. ✅ 所有验证通过，没有禁止的内容
