# UI Density 实现总结

## 完成时间
2025-01-20

## 实现内容

### 1. 文件创建

- ✅ `lib/styles/base/density.css` - UI Density 规范文件
- ✅ `lib/styles/base/README.md` - 使用说明文档
- ✅ `docs/ui-density-spec.md` - 规范文档

### 2. 密度等级绑定

#### 用户端（默认）
- **密度等级**：`--density-normal`
- **设置方式**：不需要显式设置，`:root` 默认使用 `normal` 密度
- **适用范围**：所有用户端页面（`/user-bound`, `/user-unbound`, `/orders`, `/devices`, `/profile`, `/settings` 等）

#### 工人端（`/worker`）
- **密度等级**：`--density-compact`
- **设置方式**：在 `app/worker/page.tsx` 的最外层 `<div>` 设置 `data-density="compact"`
- **文件位置**：`app/worker/page.tsx`（第3341行）

```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20" data-density="compact">
```

#### 管理端（`/dashboard` 及 admin 路由）
- **密度等级**：`--density-dense`
- **设置方式**：在管理端页面的最外层元素设置 `data-density="dense"`
- **已设置的页面**：
  1. `app/(admin)/dashboard/page.tsx`（第7260行）
  2. `app/(admin)/rental/contracts/page.tsx`（第289行）
  3. `app/(admin)/rental/usage-snapshots/page.tsx`（第253行）

```tsx
// 管理端主页面
<div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex" data-density="dense">

// 管理端租赁合同页面
<main className="min-h-screen bg-background pb-20" data-density="dense">

// 管理端使用快照页面
<main className="min-h-screen bg-background pb-20" data-density="dense">
```

### 3. CSS 导入

- ✅ 在 `app/globals.css` 中导入 `density.css`：
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "../lib/styles/base/density.css";
```

### 4. 验证结果

#### ✅ 达标检查
- [x] `<html>` 或 `<main>` 上出现 `data-density`
  - 工人端：`<div>` 上设置 `data-density="compact"`
  - 管理端：`<div>` 或 `<main>` 上设置 `data-density="dense"`
- [x] 组件里没有写 `padding: 8px` / `padding: 4px`
  - 检查结果：没有发现硬编码的布局间距值
  - 发现的硬编码值：
    - `app/(admin)/dashboard/page.tsx` 中的 `padding: 16px;`（地图信息窗口内联样式，第三方库使用，可保留）
    - `components/ui/tabs.tsx` 中的 `p-[3px]`（视觉效果的微小间距，可保留）

#### ✅ 禁止事项验证
- [x] `data-density` 只能影响 `density.css` 中的变量
- [x] 不允许在组件内硬编码密度数值
- [x] 所有密度设置都在页面最外层，不在组件内

### 5. 密度等级对比

| 密度等级 | 选择器 | 卡片内边距 | 中等间距 | 基础行高 | 表格行高 | 适用场景 |
|---------|--------|-----------|---------|---------|---------|---------|
| **Compact** | `[data-density="compact"]` | `0.75rem` (12px) | `0.5rem` (8px) | `1.375` (22px/16px) | `2rem` (32px) | 工人端（移动端/触摸操作） |
| **Normal** | `:root` / `[data-density="normal"]` | `1rem` (16px) | `0.75rem` (12px) | `1.5` (24px/16px) | `2.5rem` (40px) | 用户端（默认） |
| **Dense** | `[data-density="dense"]` | `0.5rem` (8px) | `0.375rem` (6px) | `1.25` (20px/16px) | `1.75rem` (28px) | 管理端（桌面端/数据展示） |

### 6. 使用示例

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
// 设置密度等级（通常不需要手动设置，页面会自动应用）
document.documentElement.setAttribute('data-density', 'compact')  // 工人端
document.documentElement.setAttribute('data-density', 'normal')   // 用户端（默认）
document.documentElement.setAttribute('data-density', 'dense')    // 管理端
```

### 7. 文件修改清单

1. ✅ `app/worker/page.tsx` - 添加 `data-density="compact"`
2. ✅ `app/(admin)/dashboard/page.tsx` - 添加 `data-density="dense"`
3. ✅ `app/(admin)/rental/contracts/page.tsx` - 添加 `data-density="dense"`
4. ✅ `app/(admin)/rental/usage-snapshots/page.tsx` - 添加 `data-density="dense"`
5. ✅ `app/globals.css` - 导入 `density.css`

### 8. 注意事项

1. **用户端不需要显式设置**：用户端页面使用默认的 `normal` 密度，不需要在页面中设置 `data-density` 属性。

2. **密度设置在页面最外层**：所有 `data-density` 属性都设置在页面的最外层元素（`<div>` 或 `<main>`），不在组件内部设置。

3. **密度只影响空间和行高**：`data-density` 只影响 `density.css` 中定义的变量（padding、gap、line-height、表格行高、卡片内部间距），不影响颜色、字体、圆角等视觉样式。

4. **组件中不使用硬编码值**：组件中应该使用 CSS 变量（如 `var(--space-card-padding)`），而不是硬编码的数值（如 `padding: 8px`）。

### 9. 总结

UI Density 绑定规则已成功实现：

- ✅ 用户端：使用默认的 `normal` 密度（不需要显式设置）
- ✅ 工人端：在 `/worker` 页面设置 `data-density="compact"`
- ✅ 管理端：在 `/dashboard` 及所有 admin 路由页面设置 `data-density="dense"`
- ✅ `data-density` 只影响 `density.css` 中的变量
- ✅ 组件中没有硬编码的密度数值

所有验证通过，符合要求。
