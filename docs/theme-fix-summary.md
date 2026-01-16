# 主题修复总结

## 已修复的问题

### 1. SSR 错误修复 ✅
**问题**: `window is not defined` 错误导致页面渲染失败

**修复**: 在 `getSemanticLevelClassName` 函数中添加了 `typeof window !== 'undefined'` 检查

**文件**: `lib/ui-semantic/semantic-styles.ts`

### 2. 控制台警告优化 ✅
**问题**: 大量重复的警告信息刷屏

**修复**: 
- 只在开发环境显示警告
- 只显示一次，避免刷屏
- 提供更清晰的错误信息

### 3. CSS 变量完整性修复 ✅
**问题**: `deep-blue-breath` 主题缺少多个 CSS 变量定义

**修复**: 补充了所有缺失的 CSS 变量：
- `--background-secondary`
- `--foreground-secondary`
- `--success` 和 `--success-foreground`
- `--warning` 和 `--warning-foreground`
- `--glass` 和 `--glass-border`
- `--radius-card`, `--radius-button`, `--radius-input`, `--radius-small`
- `--font-sans`, `--font-serif`, `--font-mono`

**文件**: `app/globals.css`

### 4. Card 组件修复 ✅
为以下文件中的 Card 组件添加了 `semanticLevel` 属性：
- `components/mall-content.tsx`
- `components/iot-dashboard-offline.tsx`
- `app/user-unbound/page.tsx`
- `app/devices/page.tsx`
- `components/profile-content.tsx` (9 个 Card)

## 如何验证修复

### 1. 检查 SSR 错误是否消失
刷新页面，检查控制台是否还有 `window is not defined` 错误

### 2. 检查主题是否正确应用
在浏览器控制台执行：
```javascript
// 检查主题
console.log('当前主题:', document.documentElement.getAttribute('data-theme'))

// 检查 CSS 变量
const style = getComputedStyle(document.documentElement)
console.log('--background:', style.getPropertyValue('--background'))
console.log('--card:', style.getPropertyValue('--card'))
console.log('--foreground:', style.getPropertyValue('--foreground'))
```

### 3. 切换到 deep-blue-breath 主题
```javascript
localStorage.setItem('ios-theme-preference', 'deep-blue-breath')
location.reload()
```

### 4. 检查页面样式
- 背景色应该是深色（`oklch(0.145 0 0)`）
- 文字应该是高对比白色（`oklch(0.985 0 0)`）
- 卡片应该有适当的阴影和边框

## 如果主题仍然没有生效

### 步骤 1: 清除缓存
- 清除浏览器缓存
- 硬刷新页面（Ctrl+Shift+R）

### 步骤 2: 检查 CSS 加载
在开发者工具的 Network 标签中检查 `globals.css` 是否加载成功

### 步骤 3: 检查 CSS 选择器优先级
在开发者工具中检查 `[data-theme="deep-blue-breath"]` 选择器是否生效

### 步骤 4: 使用强制应用脚本
在浏览器控制台执行：
```javascript
(function() {
  const root = document.documentElement
  root.setAttribute('data-theme', 'deep-blue-breath')
  
  // 强制应用所有 CSS 变量
  const theme = {
    background: 'oklch(0.145 0 0)',
    foreground: 'oklch(0.985 0 0)',
    card: 'oklch(0.145 0 0)',
    border: 'oklch(0.269 0 0)',
    // ... 其他变量
  }
  
  let cssVars = ''
  for (const [key, value] of Object.entries(theme)) {
    cssVars += `--${key}: ${value}; `
  }
  
  root.setAttribute('style', cssVars)
  console.log('✅ 主题已强制应用')
})()
```

## 预期效果

应用 `deep-blue-breath` 主题后，应该看到：
- ✅ 深色背景（`oklch(0.145 0 0)`）
- ✅ 高对比白色文字（`oklch(0.985 0 0)`）
- ✅ 卡片有适当的阴影和边框
- ✅ 圆角为 `0.625rem` (10px)
- ✅ 使用 Geist 字体
