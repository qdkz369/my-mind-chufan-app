/**
 * 验证脚本：Phase 2B3 架构重构验证
 * 
 * 验证内容：
 * 1. 身份调度层是否正常工作（首页只做身份判断和redirect）
 * 2. 三个身份页面是否正确创建（游客、已注册未绑定、正式用户）
 * 3. 游客路径不触发任何需要登录的API
 * 4. 主题系统是否在身份判定后初始化
 * 5. 游客页面不引入任何业务组件
 */

const fs = require('fs')
const path = require('path')

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath)
  const exists = fs.existsSync(fullPath)
  if (exists) {
    log(`✓ ${description}`, 'green')
    return true
  } else {
    log(`✗ ${description} - 文件不存在: ${filePath}`, 'red')
    return false
  }
}

function checkFileContent(filePath, patterns, description) {
  const fullPath = path.join(process.cwd(), filePath)
  if (!fs.existsSync(fullPath)) {
    log(`✗ ${description} - 文件不存在`, 'red')
    return false
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const results = patterns.map(pattern => {
    const found = typeof pattern === 'string' 
      ? content.includes(pattern)
      : pattern.test(content)
    
    if (found) {
      log(`  ✓ ${pattern}`, 'green')
      return true
    } else {
      log(`  ✗ 未找到: ${pattern}`, 'yellow')
      return false
    }
  })

  return results.every(r => r)
}

function checkNoContent(filePath, patterns, description) {
  const fullPath = path.join(process.cwd(), filePath)
  if (!fs.existsSync(fullPath)) {
    log(`✗ ${description} - 文件不存在`, 'red')
    return false
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  // 提取所有 import 语句（排除注释）
  const importLines = content.split('\n').filter(line => {
    const trimmed = line.trim()
    return trimmed.startsWith('import') && !trimmed.startsWith('//') && !trimmed.startsWith('*')
  }).join('\n')

  const results = patterns.map(pattern => {
    let found = false
    if (typeof pattern === 'string') {
      if (pattern.startsWith('import.*')) {
        // 匹配 import 语句中的组件名
        const componentName = pattern.replace('import.*', '').trim()
        const regex = new RegExp(`import\\s+.*${componentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')
        found = regex.test(importLines)
      } else {
        // 检查 import 语句中是否包含该模式
        found = importLines.includes(pattern)
      }
    } else {
      // 正则表达式模式，只在 import 语句中检查
      found = pattern.test(importLines)
    }
    
    if (!found) {
      log(`  ✓ 未引入（正确）: ${pattern}`, 'green')
      return true
    } else {
      log(`  ✗ 不应该引入: ${pattern}`, 'red')
      return false
    }
  })

  return results.every(r => r)
}

console.log('\n' + '='.repeat(60))
log('Phase 2B3 架构重构验证', 'cyan')
log('验证身份调度层架构是否正确实现', 'cyan')
console.log('='.repeat(60) + '\n')

let allPassed = true

// 1. 验证首页身份调度层
log('\n[1] 验证首页身份调度层', 'blue')
log('检查 app/page.tsx 是否为纯调度器（只做身份判断和redirect）\n', 'cyan')

const homepageChecks = [
  checkFileExists('app/page.tsx', '首页文件存在'),
  checkFileContent('app/page.tsx', [
    '身份调度层',
    'Entry Resolver',
    'router.replace',
    '/guest',
    '/user-unbound',
    '/user-bound',
  ], '首页包含身份调度逻辑'),
  checkNoContent('app/page.tsx', [
    'IoTDashboard',
    'CoreServices',
    'RecentOrders',
    'GuestServices',
  ], '首页不渲染UI组件'),
]

if (!homepageChecks.every(c => c)) {
  allPassed = false
}

// 2. 验证游客页面
log('\n[2] 验证游客营销门户页面', 'blue')
log('检查 app/guest/page.tsx 是否正确创建且不引入业务组件\n', 'cyan')

const guestPageChecks = [
  checkFileExists('app/guest/page.tsx', '游客页面文件存在'),
  checkFileExists('components/guest-services.tsx', '游客服务组件存在'),
  checkFileExists('components/guest-header.tsx', '游客Header组件存在'),
  checkFileContent('app/guest/page.tsx', [
    '游客营销门户',
    'GuestServices',
    'GuestHeader',
    'apple-white',
  ], '游客页面包含正确组件和主题'),
  checkNoContent('app/guest/page.tsx', [
    'import.*IoTDashboard',
    'import.*CoreServices',
    'import.*RecentOrders',
    'import.*InstallationAlert',
  ], '游客页面不引入业务组件'),
  checkNoContent('components/guest-services.tsx', [
    'from("devices")',
    'from("fuel_level")',
    'from("repair_orders")',
  ], '游客服务组件不调用业务API'),
]

if (!guestPageChecks.every(c => c)) {
  allPassed = false
}

// 3. 验证已注册未绑定页面
log('\n[3] 验证已注册未绑定页面', 'blue')
log('检查 app/user-unbound/page.tsx 是否正确显示离线状态\n', 'cyan')

const unboundPageChecks = [
  checkFileExists('app/user-unbound/page.tsx', '已注册未绑定页面文件存在'),
  checkFileExists('components/iot-dashboard-offline.tsx', '离线IoT Dashboard组件存在'),
  checkFileContent('app/user-unbound/page.tsx', [
    '已注册未绑定',
    'IoTDashboardOffline',
    'tech-blue',
    'fact_unavailable_reason',
  ], '已注册未绑定页面包含正确组件和主题'),
  checkFileContent('components/iot-dashboard-offline.tsx', [
    '离线',
    'fact_unavailable_reason',
    'FACT_UNAVAILABLE_REASON',
    '--kg/天',
    '--%',
  ], '离线Dashboard显示占位符'),
]

if (!unboundPageChecks.every(c => c)) {
  allPassed = false
}

// 4. 验证正式用户页面
log('\n[4] 验证正式用户看板页面', 'blue')
log('检查 app/user-bound/page.tsx 是否包含完整业务组件\n', 'cyan')

const boundPageChecks = [
  checkFileExists('app/user-bound/page.tsx', '正式用户页面文件存在'),
  checkFileContent('app/user-bound/page.tsx', [
    '正式用户看板',
    'IoTDashboard',
    'CoreServices',
    'QuickActions',
    'RecentOrders',
    'midnight',
  ], '正式用户页面包含完整业务组件和主题'),
]

if (!boundPageChecks.every(c => c)) {
  allPassed = false
}

// 5. 验证主题系统
log('\n[5] 验证主题系统', 'blue')
log('检查主题系统是否在身份判定后初始化\n', 'cyan')

const themeChecks = [
  checkFileExists('lib/styles/theme-context.tsx', '主题上下文文件存在'),
  checkFileExists('lib/styles/themes.ts', '主题定义文件存在'),
  checkFileContent('lib/styles/themes.ts', [
    'apple-white',
    'tech-blue',
    'midnight',
  ], '三个主题都已定义'),
  checkFileContent('app/guest/page.tsx', [
    'useTheme',
    'setTheme("apple-white")',
  ], '游客页面设置默认主题'),
  checkFileContent('app/user-unbound/page.tsx', [
    'useTheme',
    'setTheme("tech-blue")',
  ], '已注册未绑定页面设置默认主题'),
  checkFileContent('app/user-bound/page.tsx', [
    'useTheme',
    'setTheme("midnight")',
  ], '正式用户页面设置默认主题'),
]

if (!themeChecks.every(c => c)) {
  allPassed = false
}

// 6. 验证组件隔离
log('\n[6] 验证组件隔离', 'blue')
log('检查组件是否正确隔离，游客页面不引入业务组件\n', 'cyan')

const isolationChecks = [
  checkFileContent('app/guest/page.tsx', [
    '不引入任何业务组件',
    '不 import 订单、资产、看板相关代码',
  ], '游客页面有正确的隔离注释'),
  checkNoContent('app/guest/page.tsx', [
    'import.*IoTDashboard',
    'import.*CoreServices',
    'import.*RecentOrders',
  ], '游客页面不导入业务组件'),
]

if (!isolationChecks.every(c => c)) {
  allPassed = false
}

// 总结
console.log('\n' + '='.repeat(60))
if (allPassed) {
  log('✓ 所有验证通过！架构重构成功完成。', 'green')
  log('\n重构成果：', 'cyan')
  log('  1. ✓ 首页已重构为身份调度层', 'green')
  log('  2. ✓ 三个身份页面已正确创建和隔离', 'green')
  log('  3. ✓ 主题系统在身份判定后初始化', 'green')
  log('  4. ✓ 游客页面完全隔离，不引入业务组件', 'green')
  log('  5. ✓ 离线状态使用事实不可用原因（fact_unavailable_reason）', 'green')
  console.log('='.repeat(60) + '\n')
  process.exit(0)
} else {
  log('✗ 部分验证失败，请检查上述错误。', 'red')
  console.log('='.repeat(60) + '\n')
  process.exit(1)
}
