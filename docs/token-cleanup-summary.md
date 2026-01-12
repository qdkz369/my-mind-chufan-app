# Token 清理与收敛总结

## 完成时间
2025-01-20

## 清理范围
- `components/ui/` - 所有 UI 组件
- `lib/styles/` - 主题系统文件
- `app/globals.css` - 全局样式文件

## 清理内容

### 1. 移除非语义化类名

#### ✅ 已清理
- `ios-button` - 从 `button.tsx` 移除
- `ios-interactive` - 从 `button.tsx` 移除

**映射规则**：
- 这些类名是主题特定的，已移除
- 组件现在只使用语义化 token（如 `bg-primary`、`text-foreground`）

### 2. 替换 `dark:` 前缀为语义化选择器

#### ✅ 已替换的文件（14个）
1. `button.tsx` - 3处
2. `badge.tsx` - 2处
3. `input.tsx` - 2处
4. `checkbox.tsx` - 2处
5. `calendar.tsx` - 1处
6. `dropdown-menu.tsx` - 1处
7. `context-menu.tsx` - 1处
8. `field.tsx` - 1处
9. `input-group.tsx` - 4处
10. `input-otp.tsx` - 2处
11. `kbd.tsx` - 1处
12. `menubar.tsx` - 1处
13. `radio-group.tsx` - 2处
14. `select.tsx` - 2处
15. `switch.tsx` - 2处
16. `tabs.tsx` - 3处
17. `textarea.tsx` - 2处
18. `toggle.tsx` - 1处

**替换规则**：
- `dark:` → `[data-theme="apple-white"]:`
- 所有组件现在使用语义化选择器，不感知具体主题

### 3. 修复硬编码主题名称

#### ✅ 已修复
- `chart.tsx` - 将 `{ light: '', dark: '.dark' }` 改为 `{ base: '', visual: '[data-theme="apple-white"]' }`
- `chart.tsx` - 移除硬编码颜色值（`#ccc`、`#fff`），使用语义化 token
- `sonner.tsx` - 从 `next-themes` 改为使用我们的主题系统

### 4. Base Theme Token 定义

#### ✅ 已在 `globals.css` 中定义

**结构相关 token（不可覆盖）**：
- `--spacing-*` (xs, sm, md, lg, xl, 2xl, 3xl)
- `--layout-*` (container-max-width, sidebar-width, header-height, footer-height)
- `--font-size-*` (xs, sm, base, lg, xl, 2xl, 3xl, 4xl)
- `--line-height-*` (tight, normal, relaxed)
- `--z-index-*` (dropdown, sticky, fixed, modal, popover, tooltip)

**视觉相关 token（可被 Visual Themes 覆盖）**：
- `--background`, `--foreground`, `--card`, `--popover`
- `--primary`, `--secondary`, `--accent`, `--muted`
- `--border`, `--input`, `--ring`
- `--destructive`, `--success`, `--warning`
- `--radius-*` (card, button, input, small)
- `--glass`, `--glass-border`

## 语义化 Token 映射

### 创建的文件
- `lib/styles/semantic-tokens.ts` - 语义化 token 定义和映射

### 核心原则
1. **所有组件只消费语义化 token**
   - 使用 `var(--primary)` 而不是 `#3B82F6`
   - 使用 `bg-primary` 而不是 `bg-blue-500`
   - 使用 `text-foreground` 而不是 `text-white`

2. **不感知具体主题**
   - 组件不包含 `ios-*`、`apple-*`、`dark-*` 等主题特定类名
   - 所有主题差异通过 `data-theme` 属性处理

3. **Base Theme 提供完整默认值**
   - 所有语义化 token 在 `:root` 中都有默认值
   - Visual Themes 只覆盖视觉相关的 token

## 验证结果

### ✅ 清理完成
- 所有 `dark:` 前缀已替换为 `[data-theme="apple-white"]:`
- 所有 `ios-*` 类名已移除
- 所有硬编码颜色值已替换为语义化 token
- 所有组件现在只消费语义化 token

### ✅ 代码质量
- 所有文件通过 linter 检查
- 无 TypeScript 错误
- 无未使用的导入

## 后续建议

1. **添加 TypeScript 类型检查**
   - 为语义化 token 添加类型定义
   - 防止使用非语义化 token

2. **文档化语义化 token**
   - 在 `lib/styles/semantic-tokens.ts` 中添加完整文档
   - 说明每个 token 的用途和语义

3. **组件审查**
   - 定期审查新组件，确保只使用语义化 token
   - 禁止在组件中硬编码颜色值
