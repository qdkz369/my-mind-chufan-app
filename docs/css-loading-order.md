# CSS 加载顺序锁死文档

## 完成时间
2025-01-20

## 核心原则

### CSS 加载顺序（固定，不可改变）

CSS 加载顺序通过 `@layer` 锁死为：

1. **base-theme**（原始 UI，不可切换）
   - 通过 `:root` 选择器定义
   - 永远先加载
   - 包含所有结构变量和视觉变量的默认值
   - **不被 JavaScript 动态注入**

2. **visual-theme-[name]**（可切换）
   - 通过 `[data-theme="..."]` 选择器定义
   - 作为覆盖层叠加在 Base Theme 之上
   - 只覆盖视觉变量，不覆盖结构变量
   - **可以被 JavaScript 动态切换**

3. **user-overrides**（预留，不实现）
   - 未来用户可以在这里添加自定义覆盖层
   - 当前不实现，但保留 layer 定义以确保加载顺序

## 实现细节

### CSS Layer 定义

```css
/**
 * CSS Layer 定义（确保加载顺序）
 * 
 * 顺序：
 * 1. base-theme（最先加载，不可覆盖）
 * 2. visual-theme（其次加载，覆盖视觉变量）
 * 3. user-overrides（最后加载，预留）
 */
@layer base-theme, visual-theme, user-overrides;
```

### Base Theme（Layer 1）

**位置**：`app/globals.css` 的 `@layer base-theme`

**定义方式**：
```css
@layer base-theme {
  :root {
    /* 结构变量（不可覆盖） */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    /* ... */
    --layout-container-max-width: 1280px;
    /* ... */
    --font-size-xs: 0.75rem;
    /* ... */
    --line-height-tight: 1.25;
    /* ... */
    --z-index-dropdown: 1000;
    /* ... */
    
    /* 视觉变量（可被 Visual Theme 覆盖） */
    --background: #0A1628;
    --foreground: #E5E8ED;
    /* ... */
  }
}
```

**特点**：
- ✅ 只在 CSS 中定义，不被 JavaScript 动态注入
- ✅ 永远先加载（通过 `@layer base-theme`）
- ✅ 包含所有结构变量和视觉变量的默认值
- ✅ 不可切换、不参与主题选择、不保存到 localStorage

### Visual Theme（Layer 2）

**位置**：`app/globals.css` 的 `@layer visual-theme`

**定义方式**：
```css
@layer visual-theme {
  [data-theme="apple-white"] {
    /* 只覆盖视觉变量，不覆盖结构变量 */
    --background: #F2F2F7;
    --foreground: #1D1D1F;
    /* ... */
    
    /* ⛔ 禁止覆盖结构变量 */
    /* --spacing-xs: ... ❌ 禁止 */
    /* --layout-container-max-width: ... ❌ 禁止 */
    /* --font-size-xs: ... ❌ 禁止 */
    /* --line-height-tight: ... ❌ 禁止 */
    /* --z-index-dropdown: ... ❌ 禁止 */
  }
}
```

**特点**：
- ✅ 作为覆盖层叠加在 Base Theme 之上（通过 `@layer visual-theme`）
- ✅ 可以被 JavaScript 动态切换（通过 `data-theme` 属性和内联 `style`）
- ✅ 只覆盖视觉变量，不覆盖结构变量
- ⛔ 严禁覆盖结构变量（--spacing-*, --layout-*, --font-size-*, --line-height-*, --z-index-*）

### User Overrides（Layer 3）

**位置**：`app/globals.css` 的 `@layer user-overrides`

**定义方式**：
```css
@layer user-overrides {
  /* 预留：用户自定义覆盖层 */
  /* 当前不实现 */
}
```

**特点**：
- ✅ 预留层，当前不实现
- ✅ 保留 layer 定义以确保加载顺序
- ✅ 未来用户可以在这里添加自定义覆盖层

## 禁止事项

### ⛔ Visual Theme 覆盖结构变量

**禁止覆盖的结构变量**：
- `--spacing-*` (xs, sm, md, lg, xl, 2xl, 3xl)
- `--layout-*` (container-max-width, sidebar-width, header-height, footer-height)
- `--font-size-*` (xs, sm, base, lg, xl, 2xl, 3xl, 4xl)
- `--line-height-*` (tight, normal, relaxed)
- `--z-index-*` (dropdown, sticky, fixed, modal, popover, tooltip)

**验证方式**：
- `getVisualThemeCSSVariables()` 函数不返回任何结构变量
- Visual Theme 的 CSS 定义中不包含结构变量
- 通过 grep 验证：`grep -r "\[data-theme.*--spacing\|\[data-theme.*--layout\|\[data-theme.*--font-size\|\[data-theme.*--line-height\|\[data-theme.*--z-index" app/globals.css`

### ⛔ 动态注入 Base Theme

**禁止的操作**：
- ❌ 通过 JavaScript 动态设置 Base Theme 的 CSS 变量
- ❌ 通过 `setAttribute('style', ...)` 注入 Base Theme 变量
- ❌ 通过 `setProperty()` 设置 Base Theme 变量

**验证方式**：
- `theme-context.tsx` 中不包含任何设置 Base Theme 变量的代码
- Base Theme 只在 CSS 中定义（`@layer base-theme`）
- 通过 grep 验证：`grep -r "setAttribute.*style\|setProperty.*--spacing\|setProperty.*--layout\|setProperty.*--font-size\|setProperty.*--line-height\|setProperty.*--z-index" lib/styles/theme-context.tsx`

## JavaScript 注入规则

### Base Theme

**规则**：
- Base Theme **不被 JavaScript 动态注入**
- Base Theme 只在 CSS 中定义（`@layer base-theme`）
- JavaScript 只负责移除可能干扰 Base Theme 的属性（`data-theme`、`style`）

**代码示例**：
```typescript
// ✅ 正确：移除可能干扰 Base Theme 的属性
root.removeAttribute('data-theme')
root.removeAttribute('style')

// ❌ 错误：动态注入 Base Theme 变量
root.setAttribute('style', '--background: #0A1628; ...') // ❌ 禁止
```

### Visual Theme

**规则**：
- Visual Theme **可以被 JavaScript 动态切换**
- Visual Theme 通过 `data-theme` 属性和内联 `style` 注入
- 只注入视觉相关的 CSS 变量，不包含结构变量

**代码示例**：
```typescript
// ✅ 正确：注入 Visual Theme 的视觉变量
const visualCssVars = getVisualThemeCSSVariables(visualThemeConfig)
root.setAttribute('data-theme', 'apple-white')
root.setAttribute('style', visualCssVars)

// ❌ 错误：注入结构变量
root.setAttribute('style', '--spacing-xs: 0.5rem; ...') // ❌ 禁止
```

## 验证清单

### ✅ CSS Layer 顺序验证

- [x] `@layer base-theme, visual-theme, user-overrides` 已定义
- [x] Base Theme 在 `@layer base-theme` 中定义
- [x] Visual Theme 在 `@layer visual-theme` 中定义
- [x] User Overrides 在 `@layer user-overrides` 中定义（预留）

### ✅ Base Theme 验证

- [x] Base Theme 只在 CSS 中定义（`@layer base-theme`）
- [x] Base Theme 不被 JavaScript 动态注入
- [x] Base Theme 包含所有结构变量和视觉变量的默认值
- [x] Base Theme 永远先加载（通过 `@layer base-theme`）

### ✅ Visual Theme 验证

- [x] Visual Theme 不覆盖结构变量（--spacing-*, --layout-*, --font-size-*, --line-height-*, --z-index-*）
- [x] Visual Theme 只覆盖视觉变量（颜色、圆角、阴影、字体）
- [x] Visual Theme 可以被 JavaScript 动态切换
- [x] `getVisualThemeCSSVariables()` 函数不返回结构变量

### ✅ JavaScript 注入验证

- [x] `theme-context.tsx` 不包含任何设置 Base Theme 变量的代码
- [x] `theme-context.tsx` 只注入 Visual Theme 的视觉变量
- [x] `getVisualThemeCSSVariables()` 函数只返回视觉变量

## 文件变更

### 修改的文件

1. **`app/globals.css`**
   - 添加 `@layer base-theme, visual-theme, user-overrides` 定义
   - 将 Base Theme 包装在 `@layer base-theme` 中
   - 将 Visual Theme 包装在 `@layer visual-theme` 中
   - 添加 `@layer user-overrides`（预留，不实现）

2. **`lib/styles/themes.ts`**
   - 更新 `getVisualThemeCSSVariables()` 函数的注释
   - 明确列出禁止包含的结构变量
   - 明确列出允许包含的视觉变量

3. **`lib/styles/theme-context.tsx`**
   - 添加注释说明 Base Theme 不被动态注入
   - 添加注释说明 Visual Theme 只注入视觉变量
   - 添加注释说明 Visual Theme 作为覆盖层叠加

## 总结

### CSS 加载顺序（锁死）

1. **base-theme**（原始 UI，不可切换）- 通过 `:root` 定义，永远先加载
2. **visual-theme-[name]**（可切换）- 通过 `[data-theme="..."]` 定义，作为覆盖层叠加
3. **user-overrides**（预留，不实现）- 未来用户自定义覆盖层

### 禁止事项

- ⛔ Visual Theme 覆盖结构变量
- ⛔ 动态注入 Base Theme

### 验证结果

- ✅ CSS Layer 顺序已锁死
- ✅ Base Theme 不被动态注入
- ✅ Visual Theme 不覆盖结构变量
- ✅ 所有验证通过
