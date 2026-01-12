/**
 * 事实路径最小可用性验证（read-only）
 * 
 * 目标：验证事实治理层和健康度汇总功能是否正常工作
 * 
 * 要求：
 * 1. 不修改任何数据库结构
 * 2. 不引入 UI
 * 3. 不引入新的业务逻辑
 * 
 * 步骤：
 * A. 构造 1 个 order_id（可写死 UUID）
 * B. 在 audit_logs 表中插入 3～4 条"仅用于验证"的记录
 * C. 调用现有 GET /api/facts/orders/:order_id
 * D. 输出完整 API JSON 响应
 * E. 明确指出：
 *    - 是否生成了 fact_warnings_structured
 *    - fact_health.score 是多少
 *    - 每一条 warning 来自哪条 audit_logs 记录
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// 使用 Node.js 内置的 fetch（Node.js 18+）或 node-fetch
let fetch
if (typeof globalThis.fetch !== 'undefined') {
  // Node.js 18+ 内置 fetch
  fetch = globalThis.fetch
} else {
  try {
    // 尝试使用 node-fetch
    fetch = require('node-fetch')
  } catch (e) {
    // 如果都不存在，提示用户
    console.error('❌ 需要 Node.js 18+ 或安装 node-fetch')
    console.error('   安装: npm install node-fetch@2')
    process.exit(1)
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 环境变量')
  console.error('需要: NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY (或 NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 写死的测试 order_id（UUID 格式）
const TEST_ORDER_ID = '00000000-0000-0000-0000-000000000001'

async function verifyFactPathMinimal() {
  console.log('🔍 开始事实路径最小可用性验证（read-only）...\n')
  console.log('=' .repeat(80))

  try {
    // ========== 步骤 A：构造或查找测试订单 ==========
    console.log('\n📋 步骤 A: 构造/查找测试订单...')
    
    // 先尝试查找是否存在该订单
    const { data: existingOrder, error: orderCheckError } = await supabase
      .from('delivery_orders')
      .select('id, restaurant_id, status, created_at, updated_at')
      .eq('id', TEST_ORDER_ID)
      .maybeSingle()

    let testOrderId = TEST_ORDER_ID
    let testRestaurantId = null
    let orderCreatedAt = null

    if (existingOrder) {
      console.log(`✅ 找到现有订单: ${testOrderId}`)
      testRestaurantId = existingOrder.restaurant_id
      orderCreatedAt = new Date(existingOrder.created_at)
      console.log(`   餐厅ID: ${testRestaurantId}`)
      console.log(`   状态: ${existingOrder.status}`)
      console.log(`   创建时间: ${existingOrder.created_at}`)
    } else {
      // 如果订单不存在，需要创建一个测试订单
      console.log(`⚠️  订单 ${testOrderId} 不存在，需要创建测试订单`)
      
      // 先查找一个存在的 restaurant_id
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (!restaurants) {
        console.error('❌ 数据库中没有餐厅，无法创建测试订单')
        console.error('   请先通过应用创建至少一个餐厅')
        return
      }

      testRestaurantId = restaurants.id
      orderCreatedAt = new Date()
      
      // 创建测试订单
      const { data: newOrder, error: createOrderError } = await supabase
        .from('delivery_orders')
        .insert({
          id: TEST_ORDER_ID,
          restaurant_id: testRestaurantId,
          status: 'pending',
          created_at: orderCreatedAt.toISOString(),
          updated_at: orderCreatedAt.toISOString(),
        })
        .select()
        .single()

      if (createOrderError) {
        console.error('❌ 创建测试订单失败:', createOrderError)
        return
      }

      console.log(`✅ 已创建测试订单: ${testOrderId}`)
      console.log(`   餐厅ID: ${testRestaurantId}`)
      console.log(`   创建时间: ${orderCreatedAt.toISOString()}`)
    }

    // ========== 步骤 B：插入测试 audit_logs 记录 ==========
    console.log('\n📝 步骤 B: 插入测试 audit_logs 记录...')
    
    // 先清理可能存在的旧测试记录（metadata.test = true）
    await supabase
      .from('audit_logs')
      .delete()
      .eq('target_type', 'delivery_order')
      .eq('target_id', testOrderId)
      .eq('metadata->>test', 'true')

    console.log('   已清理旧的测试记录')

    // 准备插入的测试记录
    const testAuditLogs = []

    // 记录 1: ORDER_ACCEPT（正常时间）
    const acceptTime = new Date(orderCreatedAt.getTime() + 5 * 60 * 1000) // 订单创建后 5 分钟
    testAuditLogs.push({
      target_type: 'delivery_order',
      target_id: testOrderId,
      action: 'ORDER_ACCEPT',
      created_at: acceptTime.toISOString(),
      actor_id: null,
      metadata: { test: true, description: '正常 ORDER_ACCEPT 记录' }
    })

    // 记录 2: ORDER_COMPLETE（正常时间）
    const completeTime = new Date(orderCreatedAt.getTime() + 30 * 60 * 1000) // 订单创建后 30 分钟
    testAuditLogs.push({
      target_type: 'delivery_order',
      target_id: testOrderId,
      action: 'ORDER_COMPLETE',
      created_at: completeTime.toISOString(),
      actor_id: null,
      metadata: { test: true, description: '正常 ORDER_COMPLETE 记录' }
    })

    // 记录 3: ORDER_COMPLETED（时间异常：早于订单创建时间）
    const abnormalCompleteTime = new Date(orderCreatedAt.getTime() - 30 * 60 * 1000) // 订单创建前 30 分钟
    testAuditLogs.push({
      target_type: 'delivery_order',
      target_id: testOrderId,
      action: 'ORDER_COMPLETED',
      created_at: abnormalCompleteTime.toISOString(),
      actor_id: null,
      metadata: { test: true, description: '时间异常：ORDER_COMPLETED 早于订单创建时间' }
    })

    // 记录 4: ORDER_ACCEPTED（时间异常：早于订单创建时间）
    const abnormalAcceptTime = new Date(orderCreatedAt.getTime() - 10 * 60 * 1000) // 订单创建前 10 分钟
    testAuditLogs.push({
      target_type: 'delivery_order',
      target_id: testOrderId,
      action: 'ORDER_ACCEPTED',
      created_at: abnormalAcceptTime.toISOString(),
      actor_id: null,
      metadata: { test: true, description: '时间异常：ORDER_ACCEPTED 早于订单创建时间' }
    })

    // 插入所有测试记录
    const { data: insertedLogs, error: insertError } = await supabase
      .from('audit_logs')
      .insert(testAuditLogs)
      .select()

    if (insertError) {
      console.error('❌ 插入测试 audit_logs 失败:', insertError)
      return
    }

    console.log(`✅ 已插入 ${insertedLogs.length} 条测试 audit_logs 记录:`)
    insertedLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.action} - ${log.created_at} (${log.metadata?.description || ''})`)
    })

    // 保存插入的记录 ID，用于后续分析
    const insertedLogIds = insertedLogs.map(log => log.id)

    // ========== 步骤 C：调用 API ==========
    console.log('\n🌐 步骤 C: 调用 GET /api/facts/orders/:order_id...')
    
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000'
    const apiEndpoint = `${apiUrl}/api/facts/orders/${testOrderId}`
    
    console.log(`   调用: ${apiEndpoint}`)
    console.log(`   请求头: x-restaurant-id: ${testRestaurantId}`)

    const response = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'x-restaurant-id': testRestaurantId,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API 调用失败 (${response.status}):`, errorText)
      return
    }

    const apiResponse = await response.json()
    
    // ========== 步骤 D：输出完整 API JSON 响应 ==========
    console.log('\n📄 步骤 D: 完整 API JSON 响应')
    console.log('=' .repeat(80))
    console.log(JSON.stringify(apiResponse, null, 2))
    console.log('=' .repeat(80))

    // ========== 步骤 E：分析结果 ==========
    console.log('\n🔍 步骤 E: 结果分析')
    console.log('=' .repeat(80))

    // E1: 是否生成了 fact_warnings_structured
    console.log('\n✅ E1. fact_warnings_structured 生成情况:')
    if (apiResponse.fact_warnings_structured && apiResponse.fact_warnings_structured.length > 0) {
      console.log(`   ✅ 已生成 ${apiResponse.fact_warnings_structured.length} 条结构化警告`)
      apiResponse.fact_warnings_structured.forEach((warning, index) => {
        console.log(`   ${index + 1}. [${warning.level.toUpperCase()}] ${warning.code}`)
        console.log(`      消息: ${warning.message}`)
        console.log(`      字段: ${warning.fields.join(', ')}`)
      })
    } else {
      console.log('   ❌ 未生成 fact_warnings_structured')
    }

    // E2: fact_health.score
    console.log('\n✅ E2. fact_health.score:')
    if (apiResponse.fact_health) {
      console.log(`   ✅ 健康度分数: ${apiResponse.fact_health.score}`)
      console.log(`   汇总:`)
      console.log(`     - high: ${apiResponse.fact_health.summary.high}`)
      console.log(`     - medium: ${apiResponse.fact_health.summary.medium}`)
      console.log(`     - low: ${apiResponse.fact_health.summary.low}`)
    } else {
      console.log('   ❌ 未生成 fact_health')
    }

    // E3: 每条 warning 来自哪条 audit_logs 记录
    console.log('\n✅ E3. 警告与 audit_logs 记录的关联:')
    
    // 查询所有相关的 audit_logs 记录
    const { data: allAuditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('target_type', 'delivery_order')
      .eq('target_id', testOrderId)
      .order('created_at', { ascending: true })

    console.log(`   相关 audit_logs 记录总数: ${allAuditLogs?.length || 0}`)
    
    if (apiResponse.fact_warnings_structured && allAuditLogs) {
      apiResponse.fact_warnings_structured.forEach((warning, index) => {
        console.log(`\n   警告 ${index + 1}: ${warning.code} (${warning.level})`)
        
        // 根据警告类型匹配 audit_logs 记录
        let matchedLogs = []
        
        if (warning.code === 'FACT_TIME_INVERSION') {
          // 时间倒置：查找 ORDER_COMPLETED 或 ORDER_COMPLETE 记录
          matchedLogs = allAuditLogs.filter(log => 
            (log.action === 'ORDER_COMPLETED' || log.action === 'ORDER_COMPLETE') &&
            new Date(log.created_at) < orderCreatedAt
          )
        } else if (warning.code === 'FACT_ACCEPTED_AT_MISSING_AUDIT_LOG') {
          // accepted_at 存在但无对应记录
          matchedLogs = allAuditLogs.filter(log => 
            log.action === 'ORDER_ACCEPT' || log.action === 'ORDER_ACCEPTED'
          )
        } else if (warning.code === 'FACT_TIMELINE_BREAK' || warning.code === 'FACT_TIMELINE_ANOMALY') {
          // 时间线断裂或异常
          matchedLogs = allAuditLogs.filter(log => 
            new Date(log.created_at) < orderCreatedAt
          )
        }

        if (matchedLogs.length > 0) {
          console.log(`      ✅ 关联的 audit_logs 记录:`)
          matchedLogs.forEach(log => {
            const isTestRecord = log.metadata?.test === true
            console.log(`         - ID: ${log.id}`)
            console.log(`           Action: ${log.action}`)
            console.log(`           Created At: ${log.created_at}`)
            console.log(`           是否为测试记录: ${isTestRecord ? '是' : '否'}`)
            if (log.metadata?.description) {
              console.log(`           描述: ${log.metadata.description}`)
            }
          })
        } else {
          console.log(`      ⚠️  未找到直接关联的 audit_logs 记录`)
          console.log(`         可能原因: 警告来自其他数据源（如 trace_logs）`)
        }
      })
    }

    // ========== 清理说明 ==========
    console.log('\n\n🧹 清理说明:')
    console.log('=' .repeat(80))
    console.log('测试完成后，可以清理测试数据:')
    console.log(`   删除 audit_logs 中 metadata.test = true 的记录:`)
    console.log(`   DELETE FROM audit_logs WHERE target_id = '${testOrderId}' AND metadata->>'test' = 'true';`)
    console.log(`\n   如需删除测试订单:`)
    console.log(`   DELETE FROM delivery_orders WHERE id = '${testOrderId}';`)
    console.log('=' .repeat(80))

    console.log('\n✅ 验证完成！')

  } catch (error) {
    console.error('\n❌ 验证过程出错:', error)
    console.error(error.stack)
  }
}

verifyFactPathMinimal()
