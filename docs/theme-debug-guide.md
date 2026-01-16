# 主题样式调试指南

## 问题：deep-blue-breath 主题样式没有生效

### 步骤 1：检查主题是否正确切换

在浏览器控制台执行以下代码：

```javascript
// 1. 检查当前主题
console.log('当前主题:', document.documentElement.getAttribute('data-theme'))
console.log('localStorage 中的主题:', localStorage.getItem('ios-theme-preference'))

// 2. 手动切换到 deep-blue-breath
localStorage.setItem('ios-theme-preference', 'deep-blue-breath')
location.reload()
```

### 步骤 2：检查 CSS 变量是否正确应用

在浏览器控制台执行：

```javascript
// 检查呼吸感变量
const root = document.documentElement
console.log('--breath-bg-gradient:', getComputedStyle(root).getPropertyValue('--breath-bg-gradient'))
console.log('--breath-card-bg:', getComputedStyle(root).getPropertyValue('--breath-card-bg'))
console.log('--breath-card-glow:', getComputedStyle(root).getPropertyValue('--breath-card-glow'))

// 检查基础颜色变量
console.log('--background:', getComputedStyle(root).getPropertyValue('--background'))
console.log('--card:', getComputedStyle(root).getPropertyValue('--card'))
```

### 步骤 3：检查 body 背景

```javascript
// 检查 body 背景
const body = document.body
const bodyStyle = getComputedStyle(body)
console.log('body background:', bodyStyle.background)
console.log('body backgroundImage:', bodyStyle.backgroundImage)
```

### 步骤 4：检查卡片样式

```javascript
// 查找所有使用 .theme-card 的元素
const cards = document.querySelectorAll('.theme-card')
console.log('找到的卡片数量:', cards.length)

// 检查第一个卡片的样式
if (cards.length > 0) {
  const firstCard = cards[0]
  const cardStyle = getComputedStyle(firstCard)
  console.log('卡片背景:', cardStyle.background)
  console.log('卡片 boxShadow:', cardStyle.boxShadow)
  console.log('卡片 border:', cardStyle.border)
}
```

### 步骤 5：强制应用主题（如果上述步骤都正常）

如果 CSS 变量存在但样式没有生效，可能是 CSS 选择器优先级问题。在控制台执行：

```javascript
// 强制设置 data-theme
document.documentElement.setAttribute('data-theme', 'deep-blue-breath')

// 强制应用 body 背景
document.body.style.background = 'var(--breath-bg-gradient)'
document.body.style.backgroundAttachment = 'fixed'
```

### 步骤 6：检查 CSS 文件是否正确加载

```javascript
// 检查 globals.css 是否加载
const stylesheets = Array.from(document.styleSheets)
const globalsCss = stylesheets.find(sheet => {
  try {
    return sheet.href && sheet.href.includes('globals.css')
  } catch (e) {
    return false
  }
})

if (globalsCss) {
  console.log('✅ globals.css 已加载')
  
  // 检查 deep-blue-breath 规则是否存在
  try {
    const rules = Array.from(globalsCss.cssRules || globalsCss.rules)
    const deepBlueRules = rules.filter(rule => {
      return rule.selectorText && rule.selectorText.includes('deep-blue-breath')
    })
    console.log('找到 deep-blue-breath 规则数量:', deepBlueRules.length)
  } catch (e) {
    console.log('⚠️ 无法读取 CSS 规则（可能是跨域问题）')
  }
} else {
  console.log('❌ globals.css 未找到')
}
```

## 常见问题排查

### 问题 1：主题切换后页面没有刷新
**解决**：手动刷新页面（F5 或 Ctrl+R）

### 问题 2：CSS 变量存在但样式没有应用
**可能原因**：
- CSS 选择器优先级不够
- 有其他样式覆盖了主题样式
- 浏览器缓存问题

**解决**：
1. 清除浏览器缓存并硬刷新（Ctrl+Shift+R）
2. 检查是否有内联样式覆盖了 CSS 变量

### 问题 3：主题切换器显示"默认主题"但实际主题已切换
**已修复**：`theme-switcher.tsx` 中的 `getCurrentThemeName()` 函数已更新，现在会正确显示所有主题名称。

### 问题 4：body 背景没有渐变效果
**检查**：
1. 确认 `[data-theme="deep-blue-breath"] body` 规则是否存在
2. 确认 `--breath-bg-gradient` 变量是否定义
3. 检查是否有其他样式覆盖了 body 背景

## 快速修复脚本

如果所有检查都正常但样式仍然没有生效，在控制台执行以下脚本强制应用：

```javascript
(function() {
  const root = document.documentElement
  const body = document.body
  
  // 1. 设置主题属性
  root.setAttribute('data-theme', 'deep-blue-breath')
  
  // 2. 应用 body 背景
  body.style.background = 'var(--breath-bg-gradient)'
  body.style.backgroundAttachment = 'fixed'
  body.style.backgroundColor = 'var(--background)'
  
  // 3. 应用卡片样式（为所有 .theme-card 元素）
  document.querySelectorAll('.theme-card').forEach(card => {
    card.style.background = 'var(--breath-card-bg)'
    card.style.backgroundColor = 'var(--card)'
    card.style.border = '1px solid rgba(255, 255, 255, 0.04)'
    card.style.boxShadow = 'var(--breath-card-glow)'
  })
  
  console.log('✅ 主题样式已强制应用')
})()
```
