# 主题诊断工具

## 快速诊断脚本

在浏览器控制台执行以下脚本，检查主题是否正确应用：

```javascript
(function() {
  console.log('=== 主题诊断开始 ===\n')
  
  const root = document.documentElement
  const body = document.body
  
  // 1. 检查当前主题
  const currentTheme = root.getAttribute('data-theme')
  const savedTheme = localStorage.getItem('ios-theme-preference')
  console.log('1. 主题状态:')
  console.log('   - DOM data-theme:', currentTheme || '(未设置)')
  console.log('   - localStorage:', savedTheme || '(未保存)')
  console.log('   - 是否匹配:', currentTheme === savedTheme ? '✅' : '❌')
  
  // 2. 检查 CSS 变量
  const computedStyle = getComputedStyle(root)
  console.log('\n2. CSS 变量检查:')
  console.log('   - --background:', computedStyle.getPropertyValue('--background') || '(未设置)')
  console.log('   - --foreground:', computedStyle.getPropertyValue('--foreground') || '(未设置)')
  console.log('   - --card:', computedStyle.getPropertyValue('--card') || '(未设置)')
  console.log('   - --border:', computedStyle.getPropertyValue('--border') || '(未设置)')
  console.log('   - --radius-card:', computedStyle.getPropertyValue('--radius-card') || '(未设置)')
  
  // 3. 检查 body 背景
  const bodyStyle = getComputedStyle(body)
  console.log('\n3. Body 样式:')
  console.log('   - background-color:', bodyStyle.backgroundColor)
  console.log('   - color:', bodyStyle.color)
  
  // 4. 检查卡片样式
  const cards = document.querySelectorAll('.theme-card, [data-slot="card"]')
  console.log('\n4. 卡片检查:')
  console.log('   - 找到卡片数量:', cards.length)
  if (cards.length > 0) {
    const firstCard = cards[0]
    const cardStyle = getComputedStyle(firstCard)
    console.log('   - 第一个卡片背景:', cardStyle.backgroundColor)
    console.log('   - 第一个卡片边框:', cardStyle.border)
    console.log('   - 第一个卡片圆角:', cardStyle.borderRadius)
    console.log('   - 第一个卡片阴影:', cardStyle.boxShadow)
  }
  
  // 5. 检查主题切换器状态
  console.log('\n5. 主题切换器:')
  const themeSwitcher = document.querySelector('[href="/themes"]')
  if (themeSwitcher) {
    const switcherText = themeSwitcher.textContent || ''
    console.log('   - 找到主题切换器:', switcherText.includes('当前') ? '✅' : '❌')
  } else {
    console.log('   - 未找到主题切换器')
  }
  
  // 6. 诊断建议
  console.log('\n6. 诊断建议:')
  if (!currentTheme) {
    console.log('   ⚠️ DOM 中没有 data-theme 属性，主题可能未正确初始化')
    console.log('   建议: 刷新页面或手动设置主题')
  }
  if (currentTheme !== savedTheme) {
    console.log('   ⚠️ DOM 主题与 localStorage 不匹配')
    console.log('   建议: 刷新页面以同步主题')
  }
  if (!computedStyle.getPropertyValue('--background')) {
    console.log('   ⚠️ CSS 变量未设置')
    console.log('   建议: 检查 globals.css 是否正确加载')
  }
  
  console.log('\n=== 主题诊断结束 ===')
})()
```

## 手动修复脚本

如果主题没有正确应用，执行以下脚本强制应用：

```javascript
(function() {
  const root = document.documentElement
  const body = document.body
  
  // 1. 强制设置主题
  const savedTheme = localStorage.getItem('ios-theme-preference') || 'deep-blue-breath'
  root.setAttribute('data-theme', savedTheme)
  
  // 2. 强制应用 body 背景
  body.style.backgroundColor = 'var(--background)'
  body.style.color = 'var(--foreground)'
  
  // 3. 强制应用卡片样式
  document.querySelectorAll('.theme-card, [data-slot="card"]').forEach(card => {
    card.style.backgroundColor = 'var(--card)'
    card.style.color = 'var(--card-foreground)'
    card.style.borderColor = 'var(--border)'
    card.style.borderRadius = 'var(--radius-card)'
  })
  
  console.log('✅ 主题已强制应用:', savedTheme)
})()
```

## 常见问题排查

### 问题 1: 主题切换后没有变化
**原因**: CSS 变量可能被缓存
**解决**: 
1. 清除浏览器缓存
2. 硬刷新页面 (Ctrl+Shift+R)
3. 检查 `globals.css` 是否正确加载

### 问题 2: 控制台警告过多
**原因**: Card 组件缺少 `semanticLevel` 属性
**解决**: 已优化警告，只在开发环境首次出现时显示

### 问题 3: 颜色值不正确
**原因**: CSS 变量可能被其他样式覆盖
**解决**: 
1. 检查是否有内联样式覆盖
2. 检查 CSS 选择器优先级
3. 使用浏览器开发者工具检查计算后的样式
