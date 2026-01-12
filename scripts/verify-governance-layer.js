/**
 * 事实治理层可用性验证脚本
 * 
 * 目标：验证 Fact Governance Layer 是否真实生效（而非静态代码）
 * 
 * 步骤：
 * 1. 找到真实存在的订单 order_id
 * 2. 人为构造至少 2 种"事实不一致"场景
 * 3. 调用 GET /api/facts/orders/{order_id}
 * 4. 验证 fact_warnings 是否出现
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 环境变量')
  console.error('需要: NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY (或 NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyGovernanceLayer() {
  console.log('🔍 开始验证事实治理层...\n')

  try {
    // ========== 步骤 1：找到真实存在的订单 ==========
    console.log('步骤 1: 查找真实订单...')
    const { data: orders, error: ordersError } = await supabase
      .from('delivery_orders')
      .select('id, restaurant_id, status, created_at, updated_at')
      .limit(1)

    if (ordersError) {
      console.error('❌ 查询订单失败:', ordersError)
      return
    }

    if (!orders || orders.length === 0) {
      console.log('⚠️  数据库中没有订单，需要先创建测试订单')
      console.log('   建议：通过应用创建至少一个订单后再运行此脚本')
      return
    }

    const testOrderId = orders[0].id
    const testRestaurantId = orders[0].restaurant_id
    console.log(`✅ 找到测试订单: ${testOrderId}`)
    console.log(`   餐厅ID: ${testRestaurantId}`)
    console.log(`   状态: ${orders[0].status}`)
    console.log(`   创建时间: ${orders[0].created_at}\n`)

    // ========== 步骤 2：构造"事实不一致"场景 ==========
    console.log('步骤 2: 构造事实不一致场景...\n')

    // 场景 2a: 在 audit_logs 中插入一个 accepted_at 时间，但不插入对应的 ORDER_ACCEPTED 记录
    // 注意：我们通过直接修改 delivery_orders 表来模拟这种情况（实际上 accepted_at 来自 audit_logs）
    // 但为了测试，我们会在 audit_logs 中插入一个假的记录，然后删除它

    // 先查询现有的 audit_logs
    const { data: existingAuditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('target_type', 'delivery_order')
      .eq('target_id', testOrderId)

    console.log(`   现有 audit_logs 记录数: ${existingAuditLogs?.length || 0}`)

    // 场景 2b: 修改 completed_at 使其早于 created_at
    // 我们需要在 audit_logs 中插入一个早于订单创建时间的 ORDER_COMPLETED 记录
    const orderCreatedAt = new Date(orders[0].created_at)
    const fakeCompletedAt = new Date(orderCreatedAt.getTime() - 24 * 60 * 60 * 1000) // 早于创建时间 24 小时

    console.log(`   构造场景 2b: completed_at 早于 created_at`)
    console.log(`   - order.created_at: ${orders[0].created_at}`)
    console.log(`   - 构造的 completed_at: ${fakeCompletedAt.toISOString()}\n`)

    // 插入一个早于创建时间的 ORDER_COMPLETED 记录
    const { error: insertError } = await supabase
      .from('audit_logs')
      .insert({
        target_type: 'delivery_order',
        target_id: testOrderId,
        action: 'ORDER_COMPLETED',
        created_at: fakeCompletedAt.toISOString(),
        actor_id: null,
        metadata: { test: true, governance_test: 'completed_before_created' }
      })

    if (insertError) {
      console.error('❌ 插入测试 audit_logs 失败:', insertError)
      return
    }
    console.log('✅ 已插入测试 audit_logs 记录（completed_at 早于 created_at）\n')

    // 场景 2c: 在 trace_logs 中插入一个不在允许枚举内的 action_type
    console.log('   构造场景 2c: trace.action_type 不在允许枚举内')
    
    // 先查询是否有 trace_logs
    const { data: existingTraces } = await supabase
      .from('trace_logs')
      .select('*')
      .eq('order_id', testOrderId)
      .limit(1)

    let testAssetId = null
    if (existingTraces && existingTraces.length > 0) {
      testAssetId = existingTraces[0].asset_id
    } else {
      // 如果没有 trace_logs，需要先找到一个 asset_id
      const { data: assets } = await supabase
        .from('gas_cylinders')
        .select('id')
        .limit(1)
      
      if (assets && assets.length > 0) {
        testAssetId = assets[0].id
      }
    }

    if (testAssetId) {
      const { error: traceInsertError } = await supabase
        .from('trace_logs')
        .insert({
          asset_id: testAssetId,
          order_id: testOrderId,
          action_type: 'INVALID_ACTION', // 不在允许枚举内
          operator_id: null,
          created_at: new Date().toISOString(),
        })

      if (traceInsertError) {
        console.error('❌ 插入测试 trace_logs 失败:', traceInsertError)
      } else {
        console.log('✅ 已插入测试 trace_logs 记录（action_type = INVALID_ACTION）\n')
      }
    } else {
      console.log('⚠️  未找到资产，跳过场景 2c\n')
    }

    // ========== 步骤 3：调用 API ==========
    console.log('步骤 3: 调用 GET /api/facts/orders/{order_id}...\n')
    
    // 注意：这里我们需要通过 HTTP 请求调用 API，而不是直接调用函数
    // 因为 API 需要完整的 Request 对象和权限验证
    console.log('⚠️  注意：此脚本需要在实际运行的应用环境中调用 API')
    console.log(`   请手动调用: GET http://localhost:3000/api/facts/orders/${testOrderId}`)
    console.log(`   或使用 curl:\n`)
    console.log(`   curl -X GET "http://localhost:3000/api/facts/orders/${testOrderId}" \\`)
    console.log(`     -H "x-restaurant-id: ${testRestaurantId}" \\`)
    console.log(`     -H "Content-Type: application/json"\n`)

    // 输出测试订单信息
    console.log('📋 测试订单信息:')
    console.log(`   Order ID: ${testOrderId}`)
    console.log(`   Restaurant ID: ${testRestaurantId}`)
    console.log(`   构造的不一致场景:`)
    console.log(`   - ✅ 场景 2b: completed_at 早于 created_at`)
    if (testAssetId) {
      console.log(`   - ✅ 场景 2c: trace.action_type = INVALID_ACTION`)
    }
    console.log(`\n   请使用上述信息调用 API 并验证 fact_warnings 是否出现。\n`)

    // ========== 清理说明 ==========
    console.log('🧹 清理说明:')
    console.log('   测试完成后，请手动清理测试数据:')
    console.log(`   1. 删除 audit_logs 中 metadata.test = true 的记录`)
    console.log(`   2. 删除 trace_logs 中 action_type = 'INVALID_ACTION' 的记录\n`)

  } catch (error) {
    console.error('❌ 验证过程出错:', error)
  }
}

verifyGovernanceLayer()
