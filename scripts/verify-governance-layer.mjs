/**
 * 事实治理层可用性验证脚本
 * 
 * 使用方法：
 * 1. 确保开发服务器运行在 http://localhost:3000
 * 2. 运行: node scripts/verify-governance-layer.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 读取 .env.local
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')
    const env = {}
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '')
        env[key] = value
      }
    })
    return env
  } catch (error) {
    console.error('⚠️  无法读取 .env.local，使用环境变量')
    return process.env
  }
}

const env = loadEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 环境变量')
  console.error('需要: NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY (或 NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const API_BASE_URL = 'http://localhost:3000'

async function verifyGovernanceLayer() {
  console.log('🔍 开始验证事实治理层...\n')
  console.log('=' .repeat(60))

  try {
    // ========== 步骤 1：找到真实存在的订单 ==========
    console.log('\n📋 步骤 1: 查找真实订单...')
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
    console.log(`✅ 找到测试订单:`)
    console.log(`   Order ID: ${testOrderId}`)
    console.log(`   Restaurant ID: ${testRestaurantId}`)
    console.log(`   状态: ${orders[0].status}`)
    console.log(`   创建时间: ${orders[0].created_at}`)

    // ========== 步骤 2：构造"事实不一致"场景 ==========
    console.log('\n🔧 步骤 2: 构造事实不一致场景...\n')

    const orderCreatedAt = new Date(orders[0].created_at)
    const fakeCompletedAt = new Date(orderCreatedAt.getTime() - 24 * 60 * 60 * 1000) // 早于创建时间 24 小时

    console.log('   场景 2b: completed_at 早于 created_at')
    console.log(`   - order.created_at: ${orders[0].created_at}`)
    console.log(`   - 构造的 completed_at: ${fakeCompletedAt.toISOString()}`)

    // 插入一个早于创建时间的 ORDER_COMPLETED 记录
    const { error: insertError, data: insertedAuditLog } = await supabase
      .from('audit_logs')
      .insert({
        target_type: 'delivery_order',
        target_id: testOrderId,
        action: 'ORDER_COMPLETED',
        created_at: fakeCompletedAt.toISOString(),
        actor_id: null,
        metadata: { test: true, governance_test: 'completed_before_created' }
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ 插入测试 audit_logs 失败:', insertError)
      return
    }
    console.log(`✅ 已插入测试 audit_logs 记录 (ID: ${insertedAuditLog.id})`)

    // 场景 2c: 在 trace_logs 中插入一个不在允许枚举内的 action_type
    console.log('\n   场景 2c: trace.action_type 不在允许枚举内')
    
    // 先查询是否有 trace_logs 或 assets
    const { data: existingTraces } = await supabase
      .from('trace_logs')
      .select('asset_id')
      .eq('order_id', testOrderId)
      .limit(1)

    let testAssetId = null
    if (existingTraces && existingTraces.length > 0) {
      testAssetId = existingTraces[0].asset_id
    } else {
      // 如果没有 trace_logs，查找一个 asset_id
      const { data: assets } = await supabase
        .from('gas_cylinders')
        .select('id')
        .limit(1)
      
      if (assets && assets.length > 0) {
        testAssetId = assets[0].id
      } else {
        // 尝试 devices 表
        const { data: devices } = await supabase
          .from('devices')
          .select('device_id')
          .limit(1)
        
        if (devices && devices.length > 0) {
          testAssetId = devices[0].device_id
        }
      }
    }

    let insertedTraceId = null
    if (testAssetId) {
      const { error: traceInsertError, data: insertedTrace } = await supabase
        .from('trace_logs')
        .insert({
          asset_id: testAssetId,
          order_id: testOrderId,
          action_type: 'INVALID_ACTION', // 不在允许枚举内
          operator_id: null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (traceInsertError) {
        console.error('❌ 插入测试 trace_logs 失败:', traceInsertError)
      } else {
        insertedTraceId = insertedTrace.id
        console.log(`✅ 已插入测试 trace_logs 记录 (ID: ${insertedTraceId}, action_type: INVALID_ACTION)`)
      }
    } else {
      console.log('⚠️  未找到资产，跳过场景 2c')
    }

    // ========== 步骤 3：调用 API ==========
    console.log('\n🌐 步骤 3: 调用 GET /api/facts/orders/{order_id}...\n')

    const apiUrl = `${API_BASE_URL}/api/facts/orders/${testOrderId}`
    console.log(`   请求 URL: ${apiUrl}`)
    console.log(`   请求头: x-restaurant-id: ${testRestaurantId}\n`)

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-restaurant-id': testRestaurantId,
          'Content-Type': 'application/json',
        },
      })

      const responseData = await response.json()

      // ========== 步骤 4：输出完整 JSON 响应 ==========
      console.log('=' .repeat(60))
      console.log('\n📦 完整 API 响应:\n')
      console.log(JSON.stringify(responseData, null, 2))
      console.log('\n' + '=' .repeat(60))

      // ========== 步骤 5：验证 fact_warnings ==========
      console.log('\n✅ 步骤 5: 验证 fact_warnings...\n')

      const statusCode = response.status
      const hasWarnings = responseData.fact_warnings && responseData.fact_warnings.length > 0

      console.log(`   HTTP 状态码: ${statusCode}`)
      console.log(`   fact_warnings 是否存在: ${hasWarnings ? '✅ 是' : '❌ 否'}`)

      if (hasWarnings) {
        console.log(`   fact_warnings 数量: ${responseData.fact_warnings.length}`)
        console.log('\n   警告内容:')
        responseData.fact_warnings.forEach((warning, index) => {
          console.log(`   ${index + 1}. ${warning}`)
        })
      }

      // ========== 步骤 6：验证数据完整性 ==========
      console.log('\n✅ 步骤 6: 验证数据完整性...\n')

      const hasOrder = !!responseData.order
      const hasAssets = Array.isArray(responseData.assets)
      const hasTraces = Array.isArray(responseData.traces)

      console.log(`   order 是否存在: ${hasOrder ? '✅ 是' : '❌ 否'}`)
      console.log(`   assets 是否存在: ${hasAssets ? '✅ 是' : '❌ 否'}`)
      console.log(`   traces 是否存在: ${hasTraces ? '✅ 是' : '❌ 否'}`)

      if (hasOrder) {
        console.log(`   order.order_id: ${responseData.order.order_id}`)
        console.log(`   order.status: ${responseData.order.status}`)
        console.log(`   order.created_at: ${responseData.order.created_at}`)
        console.log(`   order.completed_at: ${responseData.order.completed_at || 'null'}`)
      }

      // ========== 验证结果总结 ==========
      console.log('\n' + '=' .repeat(60))
      console.log('\n📊 验证结果总结:\n')

      const isSuccess = statusCode >= 200 && statusCode < 300
      const warningsMatch = hasWarnings && (
        responseData.fact_warnings.some(w => w.includes('completed_at') && w.includes('早于')) ||
        responseData.fact_warnings.some(w => w.includes('INVALID_ACTION'))
      )

      console.log(`   ✅ API 响应正常 (${statusCode}): ${isSuccess ? '✅ 是' : '❌ 否'}`)
      console.log(`   ✅ fact_warnings 出现: ${hasWarnings ? '✅ 是' : '❌ 否'}`)
      console.log(`   ✅ 警告与构造场景对应: ${warningsMatch ? '✅ 是' : '❌ 否'}`)
      console.log(`   ✅ 数据正常返回: ${hasOrder && hasAssets && hasTraces ? '✅ 是' : '❌ 否'}`)

      if (isSuccess && hasWarnings && warningsMatch && hasOrder) {
        console.log('\n   🎉 事实治理层验证通过！')
      } else {
        console.log('\n   ⚠️  部分验证未通过，请检查上述结果')
      }

      // ========== 清理说明 ==========
      console.log('\n' + '=' .repeat(60))
      console.log('\n🧹 清理测试数据:\n')
      console.log('   测试完成后，请手动清理以下测试数据:')
      if (insertedAuditLog) {
        console.log(`   1. 删除 audit_logs (ID: ${insertedAuditLog.id})`)
        console.log(`      SQL: DELETE FROM audit_logs WHERE id = '${insertedAuditLog.id}';`)
      }
      if (insertedTraceId) {
        console.log(`   2. 删除 trace_logs (ID: ${insertedTraceId})`)
        console.log(`      SQL: DELETE FROM trace_logs WHERE id = '${insertedTraceId}';`)
      }
      console.log('')

    } catch (fetchError) {
      console.error('❌ 调用 API 失败:', fetchError.message)
      console.error('\n   请确保开发服务器运行在 http://localhost:3000')
      console.error('   运行: npm run dev\n')
    }

  } catch (error) {
    console.error('❌ 验证过程出错:', error)
    console.error(error.stack)
  }
}

verifyGovernanceLayer()
