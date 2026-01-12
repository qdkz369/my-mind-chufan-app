/**
 * 阶段 2B-3 功能验证脚本
 * 用于验证 API 功能是否正常
 * 
 * 使用方法：
 * 1. 确保服务器正在运行 (npm run dev)
 * 2. 修改脚本中的测试数据（restaurant_id, worker_id 等）
 * 3. 运行: node scripts/verify-phase-2b3.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// 测试数据（需要根据实际情况修改）
const TEST_DATA = {
  restaurant_id: 'YOUR_RESTAURANT_ID', // 需要替换为真实的餐厅ID
  worker_id: 'YOUR_WORKER_ID', // 需要替换为真实的工人ID
};

// 存储测试结果
let testResults = [];

// 测试函数
async function testAPI(name, method, url, body = null, headers = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${url}`, options);
    const data = await response.json();
    
    const result = {
      name,
      status: response.status,
      success: response.ok,
      data: data,
      timestamp: new Date().toISOString(),
    };
    
    testResults.push(result);
    return result;
  } catch (error) {
    const result = {
      name,
      status: 'ERROR',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
    
    testResults.push(result);
    return result;
  }
}

// 执行所有测试
async function runTests() {
  console.log('🚀 开始执行阶段 2B-3 功能验证...\n');
  
  // 1. 创建报修工单
  console.log('1. 测试创建报修工单...');
  const createRepairResult = await testAPI(
    '创建报修工单',
    'POST',
    '/api/repair/create',
    {
      restaurant_id: TEST_DATA.restaurant_id,
      service_type: '维修服务',
      description: '阶段2B-3验证测试 - 报修工单',
      urgency: 'medium',
      contact_phone: '13800138000',
    }
  );
  
  const repairOrderId = createRepairResult.success && createRepairResult.data?.data?.id 
    ? createRepairResult.data.data.id 
    : null;
  
  console.log(`   结果: ${createRepairResult.success ? '✅' : '❌'} (状态码: ${createRepairResult.status})`);
  if (repairOrderId) {
    console.log(`   创建的工单ID: ${repairOrderId}`);
  }
  
  // 2. 查询报修工单列表
  console.log('\n2. 测试查询报修工单列表...');
  const listRepairResult = await testAPI('查询报修工单列表', 'GET', '/api/repair/list');
  console.log(`   结果: ${listRepairResult.success ? '✅' : '❌'} (状态码: ${listRepairResult.status})`);
  if (listRepairResult.success && listRepairResult.data?.data) {
    console.log(`   返回工单数量: ${listRepairResult.data.data.length}`);
    if (repairOrderId) {
      const found = listRepairResult.data.data.some(order => order.id === repairOrderId);
      console.log(`   是否包含刚创建的工单: ${found ? '✅' : '❌'}`);
    }
  }
  
  // 3. 更新报修工单状态
  if (repairOrderId) {
    console.log('\n3. 测试更新报修工单状态...');
    const updateRepairResult = await testAPI(
      '更新报修工单状态',
      'POST',
      '/api/repair/update',
      {
        id: repairOrderId,
        status: 'processing',
      }
    );
    console.log(`   结果: ${updateRepairResult.success ? '✅' : '❌'} (状态码: ${updateRepairResult.status})`);
  } else {
    console.log('\n3. 跳过更新报修工单（未创建成功）');
  }
  
  // 4. 创建燃料配送订单
  console.log('\n4. 测试创建燃料配送订单...');
  const createOrderResult = await testAPI(
    '创建燃料配送订单',
    'POST',
    '/api/orders/create',
    {
      restaurant_id: TEST_DATA.restaurant_id,
      product_type: 'lpg',
      amount: 100.00,
      status: 'pending',
    }
  );
  
  const deliveryOrderId = createOrderResult.success && createOrderResult.data?.data?.id 
    ? createOrderResult.data.data.id 
    : null;
  
  console.log(`   结果: ${createOrderResult.success ? '✅' : '❌'} (状态码: ${createOrderResult.status})`);
  if (deliveryOrderId) {
    console.log(`   创建的订单ID: ${deliveryOrderId}`);
  }
  
  // 5. 查询待接单列表
  console.log('\n5. 测试查询待接单列表...');
  const pendingOrdersResult = await testAPI('查询待接单列表', 'GET', '/api/orders/pending');
  console.log(`   结果: ${pendingOrdersResult.success ? '✅' : '❌'} (状态码: ${pendingOrdersResult.status})`);
  if (pendingOrdersResult.success && pendingOrdersResult.data?.data) {
    console.log(`   返回订单数量: ${pendingOrdersResult.data.data.length}`);
    if (deliveryOrderId) {
      const found = pendingOrdersResult.data.data.some(order => order.id === deliveryOrderId);
      console.log(`   是否包含刚创建的订单: ${found ? '✅' : '❌'}`);
    }
  }
  
  // 6. 接单/派单/完成流程（需要 worker_id）
  if (deliveryOrderId && TEST_DATA.worker_id) {
    console.log('\n6. 测试接单流程...');
    const acceptResult = await testAPI(
      '接单',
      'POST',
      '/api/orders/accept',
      {
        order_id: deliveryOrderId,
        worker_id: TEST_DATA.worker_id,
      },
      {
        'x-worker-id': TEST_DATA.worker_id,
      }
    );
    console.log(`   结果: ${acceptResult.success ? '✅' : '❌'} (状态码: ${acceptResult.status})`);
    
    console.log('\n7. 测试派单流程...');
    const dispatchResult = await testAPI(
      '派单',
      'POST',
      '/api/orders/dispatch',
      {
        id: deliveryOrderId,
        worker_id: TEST_DATA.worker_id,
      },
      {
        'x-worker-id': TEST_DATA.worker_id,
      }
    );
    console.log(`   结果: ${dispatchResult.success ? '✅' : '❌'} (状态码: ${dispatchResult.status})`);
    
    console.log('\n8. 测试完成流程...');
    const completeResult = await testAPI(
      '完成配送',
      'POST',
      '/api/orders/complete',
      {
        order_id: deliveryOrderId,
        tracking_code: 'TEST-001',
        proof_image: 'https://example.com/proof.jpg',
      },
      {
        'x-worker-id': TEST_DATA.worker_id,
      }
    );
    console.log(`   结果: ${completeResult.success ? '✅' : '❌'} (状态码: ${completeResult.status})`);
  } else {
    console.log('\n6-8. 跳过接单/派单/完成流程（需要 worker_id）');
  }
  
  // 7. 支付回调（模拟）
  console.log('\n9. 测试支付回调（模拟）...');
  if (deliveryOrderId) {
    const notifyResult = await testAPI(
      '支付回调',
      'POST',
      '/api/payment/alipay/notify',
      `out_trade_no=${deliveryOrderId}&trade_status=TRADE_SUCCESS`,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    );
    console.log(`   结果: ${notifyResult.success ? '✅' : '❌'} (状态码: ${notifyResult.status})`);
  } else {
    console.log('   跳过（未创建订单）');
  }
  
  // 输出汇总
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(50));
  
  const successCount = testResults.filter(r => r.success).length;
  const failCount = testResults.filter(r => !r.success).length;
  
  console.log(`总测试数: ${testResults.length}`);
  console.log(`成功: ${successCount} ✅`);
  console.log(`失败: ${failCount} ❌`);
  console.log(`通过率: ${((successCount / testResults.length) * 100).toFixed(1)}%`);
  
  console.log('\n详细结果:');
  testResults.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    console.log(`   状态码: ${result.status}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });
  
  // 保存结果到文件
  const fs = require('fs');
  const resultFile = 'phase-2b3-test-results.json';
  fs.writeFileSync(resultFile, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 详细结果已保存到: ${resultFile}`);
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testAPI };
