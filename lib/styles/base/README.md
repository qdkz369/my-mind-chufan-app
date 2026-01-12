# Base Styles

## UI Density（信息密度）规范

### 文件位置
`lib/styles/base/density.css`

### 核心原则

**Density 只影响空间和行高，不影响视觉风格**

- ✅ 允许影响：padding、gap、line-height、表格行高、卡片内部间距
- ⛔ 禁止影响：颜色、字体家族、字体粗细、圆角视觉风格、边框样式、阴影

### 三个密度等级

1. **`--density-compact`**（工人端）
   - 最紧凑的布局，适合移动端和触摸操作
   - 减少 padding 和 gap，提高信息密度
   - 通过 `[data-density="compact"]` 应用

2. **`--density-normal`**（用户端，默认）
   - 平衡的布局，适合大多数用户场景
   - 标准的 padding 和 gap，舒适的阅读体验
   - 通过 `:root` 或 `[data-density="normal"]` 应用

3. **`--density-dense`**（管理端）
   - 最密集的布局，适合数据展示和管理界面
   - 最大化信息密度，适合桌面端和鼠标操作
   - 通过 `[data-density="dense"]` 应用

### CSS 变量列表

#### Padding（内边距）
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

#### Gap（间距）
- `--space-gap-xs` - 极小间距（4px / 2px / 4px）
- `--space-gap-sm` - 小间距（6px / 8px / 4px）
- `--space-gap-md` - 中等间距（8px / 12px / 6px）
- `--space-gap-lg` - 大间距（12px / 16px / 8px）
- `--space-gap-xl` - 超大间距（16px / 24px / 12px）
- `--space-gap-card` - 卡片内部间距
- `--space-gap-section` - 区块间距
- `--space-gap-list` - 列表项间距
- `--space-gap-form` - 表单字段间距
- `--space-gap-button-group` - 按钮组间距

#### Line Height（行高）
- `--line-height-base` - 基础行高
- `--line-height-tight` - 紧凑行高
- `--line-height-normal` - 正常行高
- `--line-height-relaxed` - 宽松行高
- `--line-height-heading` - 标题行高
- `--line-height-body` - 正文行高
- `--line-height-caption` - 说明文字行高

#### Table（表格）
- `--space-table-cell-padding-y` - 表格单元格垂直内边距
- `--space-table-cell-padding-x` - 表格单元格水平内边距
- `--space-table-row-height` - 表格行高
- `--space-table-header-height` - 表格表头行高
- `--space-table-gap` - 表格列间距

#### Card（卡片）
- `--space-card-internal` - 卡片内部元素间距
- `--space-card-header-padding` - 卡片头部内边距
- `--space-card-body-padding` - 卡片主体内边距
- `--space-card-footer-padding` - 卡片底部内边距
- `--space-card-gap` - 卡片内部元素间距

### 使用示例

#### 在组件中使用 Density 变量

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

#### 在 JavaScript/TypeScript 中应用 Density

```typescript
// 设置密度等级
document.documentElement.setAttribute('data-density', 'compact')  // 工人端
document.documentElement.setAttribute('data-density', 'normal')   // 用户端（默认）
document.documentElement.setAttribute('data-density', 'dense')    // 管理端
```

### 验证清单

- ✅ 只包含空间和行高相关的变量
- ✅ 没有颜色、边框、阴影等视觉样式
- ✅ 定义了三个密度等级
- ✅ 所有变量都有清晰的注释说明
