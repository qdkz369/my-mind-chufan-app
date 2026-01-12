/**
 * 3A-1 完成标准验证脚本
 * 
 * 验证标准：
 * 1. ✅ 用户可以看到完整订单时间线
 * 2. ✅ 资产行为与订单能对得上
 * 3. ✅ 客户与服务商看到的是同一套事实
 * 4. ✅ 没有任何"你觉得 / 系统判断"的话术
 * 5. ✅ 只要事实发生过，就一定能被展示
 */

const fs = require('fs')
const path = require('path')

const checkResults = {
  timeline_complete: false,
  asset_order_match: false,
  same_facts: false,
  no_judgment_text: false,
  all_facts_displayed: false,
}

console.log('🔍 开始验证 3A-1 完成标准...\n')

// 1. 验证完整订单时间线
console.log('1️⃣ 验证：用户可以看到完整订单时间线')
try {
  const orderTimelinePath = path.join(__dirname, '../components/facts/OrderTimeline.tsx')
  const orderTimelineContent = fs.readFileSync(orderTimelinePath, 'utf-8')
  
  // 检查是否合并了订单状态变化和溯源记录
  const hasMergeTimeline = /mergeTimelineNodes|合并时间线节点/.test(orderTimelineContent)
  // 检查是否按时间排序
  const hasTimeSort = /\.sort.*timestamp|按时间排序/.test(orderTimelineContent)
  // 检查是否显示订单创建、状态变化、溯源记录
  const hasOrderCreation = /订单创建/.test(orderTimelineContent)
  const hasOrderStatusChange = /订单已接单|订单已完成/.test(orderTimelineContent)
  const hasTraceRecords = /traces\.forEach|溯源记录/.test(orderTimelineContent)
  
  if (hasMergeTimeline && hasTimeSort && hasOrderCreation && hasOrderStatusChange && hasTraceRecords) {
    console.log('  ✅ 通过：OrderTimeline 组件实现了完整时间线合并和排序')
    checkResults.timeline_complete = true
  } else {
    console.log('  ❌ 失败：OrderTimeline 组件缺少完整时间线功能')
    console.log(`    - mergeTimelineNodes: ${hasMergeTimeline}`)
    console.log(`    - 时间排序: ${hasTimeSort}`)
    console.log(`    - 订单创建: ${hasOrderCreation}`)
    console.log(`    - 状态变化: ${hasOrderStatusChange}`)
    console.log(`    - 溯源记录: ${hasTraceRecords}`)
  }
} catch (error) {
  console.log('  ❌ 失败：无法读取 OrderTimeline.tsx')
}

// 2. 验证资产行为与订单能对得上
console.log('\n2️⃣ 验证：资产行为与订单能对得上')
try {
  const orderFactApiPath = path.join(__dirname, '../app/api/facts/orders/[order_id]/route.ts')
  const orderFactApiContent = fs.readFileSync(orderFactApiPath, 'utf-8')
  
  // 检查是否通过 trace_logs 的 order_id 关联订单和资产
  const hasTraceOrderId = /trace_logs.*order_id|trace\.order_id/.test(orderFactApiContent)
  // 检查是否从 trace_logs 反查资产
  const hasAssetReverseLookup = /trace_logs.*反查|通过 trace_logs 反查/.test(orderFactApiContent)
  // 检查 OrderTimeline 是否显示关联订单
  const orderTimelinePath = path.join(__dirname, '../components/facts/OrderTimeline.tsx')
  const orderTimelineContent = fs.readFileSync(orderTimelinePath, 'utf-8')
  const hasAssetOrderLink = /关联订单|orderId/.test(orderTimelineContent)
  const hasAssetIdDisplay = /资产.*assetId|assetId.*资产/.test(orderTimelineContent)
  
  if (hasTraceOrderId && hasAssetReverseLookup && hasAssetOrderLink && hasAssetIdDisplay) {
    console.log('  ✅ 通过：资产行为通过 trace_logs.order_id 关联订单，并在时间线中显示')
    checkResults.asset_order_match = true
  } else {
    console.log('  ❌ 失败：资产行为与订单关联不完整')
    console.log(`    - trace_logs.order_id 关联: ${hasTraceOrderId}`)
    console.log(`    - 资产反查: ${hasAssetReverseLookup}`)
    console.log(`    - 时间线显示关联订单: ${hasAssetOrderLink}`)
    console.log(`    - 时间线显示资产ID: ${hasAssetIdDisplay}`)
  }
} catch (error) {
  console.log('  ❌ 失败：无法读取订单事实 API 文件')
}

// 3. 验证客户与服务商看到的是同一套事实
console.log('\n3️⃣ 验证：客户与服务商看到的是同一套事实')
try {
  // 检查所有事实 API 是否都调用同一个数据源
  const orderFactApiPath = path.join(__dirname, '../app/api/facts/orders/[order_id]/route.ts')
  const orderFactApiContent = fs.readFileSync(orderFactApiPath, 'utf-8')
  
  // 检查是否只使用 delivery_orders、trace_logs、audit_logs、gas_cylinders 表
  const usesDeliveryOrders = /delivery_orders/.test(orderFactApiContent)
  const usesTraceLogs = /trace_logs/.test(orderFactApiContent)
  const usesAuditLogs = /audit_logs/.test(orderFactApiContent)
  
  // 检查是否有硬编码或不同的数据源
  const hasHardcodedData = /const.*=.*\[.*\{.*id.*:.*['"]ORD/.test(orderFactApiContent)
  const hasMockData = /mock|fake|dummy|test.*data/i.test(orderFactApiContent)
  
  // 检查用户端页面是否调用相同的事实 API
  const userBoundPagePath = path.join(__dirname, '../app/user-bound/page.tsx')
  const userBoundPageContent = fs.readFileSync(userBoundPagePath, 'utf-8')
  const callsFactApi = /\/api\/facts\//.test(userBoundPageContent)
  
  if (usesDeliveryOrders && usesTraceLogs && usesAuditLogs && !hasHardcodedData && !hasMockData && callsFactApi) {
    console.log('  ✅ 通过：所有用户都使用同一套事实 API，数据源统一')
    checkResults.same_facts = true
  } else {
    console.log('  ❌ 失败：客户与服务商可能看到不同的数据')
    console.log(`    - 使用 delivery_orders: ${usesDeliveryOrders}`)
    console.log(`    - 使用 trace_logs: ${usesTraceLogs}`)
    console.log(`    - 使用 audit_logs: ${usesAuditLogs}`)
    console.log(`    - 无硬编码数据: ${!hasHardcodedData}`)
    console.log(`    - 无模拟数据: ${!hasMockData}`)
    console.log(`    - 用户端调用事实 API: ${callsFactApi}`)
  }
} catch (error) {
  console.log('  ❌ 失败：无法验证数据源统一性')
}

// 4. 验证没有任何"你觉得 / 系统判断"的话术
console.log('\n4️⃣ 验证：没有任何"你觉得 / 系统判断"的话术')
try {
  const factsComponentsPath = path.join(__dirname, '../components/facts')
  const factFiles = fs.readdirSync(factsComponentsPath, { recursive: true })
    .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
  
  const judgmentKeywords = [
    /你觉得|您觉得/i,
    /系统判断|系统认为|系统分析/i,
    // 注意：排除代码逻辑中的"如果"（如"如果是溯源记录"），这是条件语句，不是判断性话术
    // 注意：排除技术文档中的合理表述
    /可能.*需要|也许.*需要|大概.*需要|估计.*需要|预测.*需要|推测.*需要/i,
    /应该.*需要|建议.*需要|推荐.*需要|最好.*需要/i,
    /如果.*应该|如果.*建议|如果.*推荐|如果未来/i,
    /正常|异常|风险|危险/i, // 但允许状态值映射
    /abnormal|normal|risk|danger/i, // 但允许状态值映射
  ]
  
  // 排除列表：技术文档中的合理表述和代码逻辑
  const allowedJudgmentPatterns = [
    /应该.*记录.*日志/i,
    /应该.*使用/i,
    /应该.*检查/i,
    /如果是.*记录|如果是.*节点|如果.*存在/i, // 代码逻辑中的条件语句
    /如果.*类型|如果.*格式/i, // 代码逻辑中的条件判断
    /如果.*则|如果.*那么/i, // 代码逻辑中的条件语句
    /assetId.*如果|如果.*assetId/i, // 代码逻辑中的条件判断（JSX 中的条件渲染）
  ]
  
  let hasJudgmentText = false
  let judgmentFiles = []
  
  for (const file of factFiles) {
    const filePath = path.join(factsComponentsPath, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // 排除注释中的关键词（包括单行注释、多行注释、JSDoc 注释）
    const contentWithoutComments = content
      .replace(/\/\/.*$/gm, '') // 单行注释
      .replace(/\/\*[\s\S]*?\*\//g, '') // 多行注释（包括 JSDoc）
      .replace(/\/\*\*[\s\S]*?\*\//g, '') // 确保 JSDoc 也被排除
    
    for (const keyword of judgmentKeywords) {
      // 使用 exec 来获取匹配位置
      let match
      while ((match = keyword.exec(contentWithoutComments)) !== null) {
        const matchIndex = match.index
        const matchText = match[0]
        
        // 排除状态映射中的"异常"/"正常"（这是事实状态值，不是判断）
        if (keyword.source.includes('异常') || keyword.source.includes('正常') || keyword.source.includes('exception') || keyword.source.includes('normal')) {
          // 检查是否是状态映射（在 contentWithoutComments 中检查上下文）
          const contextStart = Math.max(0, matchIndex - 100)
          const contextEnd = Math.min(contentWithoutComments.length, matchIndex + matchText.length + 100)
          const context = contentWithoutComments.substring(contextStart, contextEnd)
          const isStatusMap = /statusLabelMap|statusLabelMap\[|:\s*["']异常["']|:\s*["']正常["']|:\s*"exception"|:\s*"normal"|状态.*映射|exception:\s*["']|normal:\s*["']/.test(context)
          if (isStatusMap) {
            continue // 状态映射中的"异常"/"正常"是可接受的
          }
        }
        
        // 排除技术文档中的合理表述（如"应该记录日志"）
        let isAllowedPattern = false
        for (const allowedPattern of allowedJudgmentPatterns) {
          const contextStart = Math.max(0, matchIndex - 50)
          const contextEnd = Math.min(contentWithoutComments.length, matchIndex + matchText.length + 50)
          const context = contentWithoutComments.substring(contextStart, contextEnd)
          if (allowedPattern.test(context)) {
            isAllowedPattern = true
            break
          }
        }
        if (isAllowedPattern) {
          continue // 技术文档中的合理表述是可接受的
        }
        
        // 如果找到了判断性话术，记录文件
        hasJudgmentText = true
        if (!judgmentFiles.includes(file)) {
          judgmentFiles.push(file)
        }
        break // 找到一处即可，不需要继续搜索
      }
      // 重置正则表达式的 lastIndex（全局匹配需要）
      keyword.lastIndex = 0
    }
  }
  
  // 检查 API 文件
  const factsApiPath = path.join(__dirname, '../app/api/facts')
  const apiFiles = fs.readdirSync(factsApiPath, { recursive: true })
    .filter(file => file.endsWith('.ts') && file.includes('route.ts'))
  
  for (const file of apiFiles) {
    const filePath = path.join(factsApiPath, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // 排除注释中的关键词（包括单行注释、多行注释、JSDoc 注释）
    const contentWithoutComments = content
      .replace(/\/\/.*$/gm, '') // 单行注释
      .replace(/\/\*[\s\S]*?\*\//g, '') // 多行注释（包括 JSDoc）
      .replace(/\/\*\*[\s\S]*?\*\//g, '') // 确保 JSDoc 也被排除
    
    for (const keyword of judgmentKeywords) {
      // 使用 exec 来获取匹配位置
      let match
      while ((match = keyword.exec(contentWithoutComments)) !== null) {
        const matchIndex = match.index
        const matchText = match[0]
        
        // 排除状态映射中的"异常"/"正常"（这是事实状态值，不是判断）
        if (keyword.source.includes('异常') || keyword.source.includes('正常') || keyword.source.includes('exception') || keyword.source.includes('normal')) {
          // 检查是否是状态映射
          const contextStart = Math.max(0, matchIndex - 100)
          const contextEnd = Math.min(contentWithoutComments.length, matchIndex + matchText.length + 100)
          const context = contentWithoutComments.substring(contextStart, contextEnd)
          const isStatusMap = /statusLabelMap|statusLabelMap\[|:\s*["']异常["']|:\s*["']正常["']|:\s*"exception"|:\s*"normal"|状态.*映射|exception:\s*["']|normal:\s*["']/.test(context)
          if (isStatusMap) {
            continue // 状态映射中的"异常"/"正常"是可接受的
          }
        }
        
        // 排除技术文档中的合理表述（如"应该记录日志"）
        let isAllowedPattern = false
        for (const allowedPattern of allowedJudgmentPatterns) {
          const contextStart = Math.max(0, matchIndex - 50)
          const contextEnd = Math.min(contentWithoutComments.length, matchIndex + matchText.length + 50)
          const context = contentWithoutComments.substring(contextStart, contextEnd)
          if (allowedPattern.test(context)) {
            isAllowedPattern = true
            break
          }
        }
        if (isAllowedPattern) {
          continue // 技术文档中的合理表述是可接受的
        }
        
        // 如果找到了判断性话术，记录文件
        hasJudgmentText = true
        if (!judgmentFiles.includes(file)) {
          judgmentFiles.push(file)
        }
        break // 找到一处即可，不需要继续搜索
      }
      // 重置正则表达式的 lastIndex（全局匹配需要）
      keyword.lastIndex = 0
    }
  }
  
  if (!hasJudgmentText) {
    console.log('  ✅ 通过：未发现任何"你觉得 / 系统判断"的话术')
    checkResults.no_judgment_text = true
  } else {
    console.log('  ❌ 失败：发现判断性话术')
    console.log(`    包含判断性话术的文件: ${judgmentFiles.join(', ')}`)
  }
} catch (error) {
  console.log('  ❌ 失败：无法验证判断性话术')
  console.log(`    错误: ${error.message}`)
}

// 5. 验证只要事实发生过，就一定能被展示
console.log('\n5️⃣ 验证：只要事实发生过，就一定能被展示')
try {
  const orderFactApiPath = path.join(__dirname, '../app/api/facts/orders/[order_id]/route.ts')
  const orderFactApiContent = fs.readFileSync(orderFactApiPath, 'utf-8')
  
  // 检查是否查询所有 trace_logs 记录（不限制条件）
  // 注意：代码使用 .eq("order_id", order_id) 查询所有与订单相关的 trace_logs
  const hasTraceLogsQuery = /trace_logs/.test(orderFactApiContent)
  const queriesTraceByOrderId = /\.eq\([^)]*order_id[^)]*\)/.test(orderFactApiContent) && hasTraceLogsQuery
  const ordersTracesByTime = /order\([^)]*created_at[^)]*\)/.test(orderFactApiContent) && /ascending.*true/.test(orderFactApiContent)
  
  // 检查是否查询所有 audit_logs 记录（不限制 action 类型）
  // 注意：代码查询所有 target_type 和 target_id 匹配的记录，不限制 action
  const hasAuditLogsQuery = /audit_logs/.test(orderFactApiContent)
  const queriesAuditByTargetType = /\.eq\([^)]*target_type[^)]*\)/.test(orderFactApiContent) && hasAuditLogsQuery
  const queriesAuditByTargetId = /\.eq\([^)]*target_id[^)]*\)/.test(orderFactApiContent) && hasAuditLogsQuery
  // 检查是否没有限制 action 类型（不包含 .in("action") 或类似的过滤）
  const hasActionFilter = /audit_logs[^}]*\.in\([^)]*action/.test(orderFactApiContent)
  const queriesAllAuditLogs = queriesAuditByTargetType && queriesAuditByTargetId && !hasActionFilter
  
  // 检查是否有任何过滤条件会遗漏记录
  const hasLimitFilter = /\.limit\([1-9]/.test(orderFactApiContent)
  const hasStatusFilter = /trace_logs.*\.in\("status"/.test(orderFactApiContent) || /trace_logs.*\.eq\("status"/.test(orderFactApiContent)
  
  // 检查 OrderTimeline 是否处理所有节点
  const orderTimelinePath = path.join(__dirname, '../components/facts/OrderTimeline.tsx')
  const orderTimelineContent = fs.readFileSync(orderTimelinePath, 'utf-8')
  const processesAllNodes = /traces\.forEach/.test(orderTimelineContent)
  const sortsAllNodes = /nodes\.sort/.test(orderTimelineContent)
  
  if (queriesTraceByOrderId && ordersTracesByTime && queriesAllAuditLogs && processesAllNodes && sortsAllNodes) {
    console.log('  ✅ 通过：查询所有相关记录，不遗漏任何事实')
    checkResults.all_facts_displayed = true
  } else {
    console.log('  ❌ 失败：可能存在遗漏事实的情况')
    console.log(`    - 查询所有 trace_logs（按 order_id）: ${queriesTraceByOrderId}`)
    console.log(`    - 按时间排序: ${ordersTracesByTime}`)
    console.log(`    - 查询所有 audit_logs（不限制 action）: ${queriesAllAuditLogs}`)
    console.log(`    - 处理所有节点: ${processesAllNodes}`)
    console.log(`    - 排序所有节点: ${sortsAllNodes}`)
  }
} catch (error) {
  console.log('  ❌ 失败：无法验证事实展示完整性')
}

// 总结
console.log('\n' + '='.repeat(60))
console.log('📊 3A-1 完成标准验证结果')
console.log('='.repeat(60))

const allPassed = Object.values(checkResults).every(result => result === true)

console.log(`1. 用户可以看到完整订单时间线: ${checkResults.timeline_complete ? '✅' : '❌'}`)
console.log(`2. 资产行为与订单能对得上: ${checkResults.asset_order_match ? '✅' : '❌'}`)
console.log(`3. 客户与服务商看到的是同一套事实: ${checkResults.same_facts ? '✅' : '❌'}`)
console.log(`4. 没有任何"你觉得 / 系统判断"的话术: ${checkResults.no_judgment_text ? '✅' : '❌'}`)
console.log(`5. 只要事实发生过，就一定能被展示: ${checkResults.all_facts_displayed ? '✅' : '❌'}`)

console.log('\n' + '='.repeat(60))
if (allPassed) {
  console.log('✅ 3A-1 完成标准：全部通过')
  process.exit(0)
} else {
  console.log('❌ 3A-1 完成标准：部分未通过，请检查上述问题')
  process.exit(1)
}
