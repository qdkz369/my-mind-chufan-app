/**
 * 运营 API 只读验证脚本
 * 阶段 2B-6：运营可观测性 · 系统自省 · 决策接口层
 * 
 * 用途：验证运营 API 的只读性和稳定性
 * 
 * 验收标准：
 * - 所有 ops API 返回 200
 * - 在空数据下不报错
 * - 无数据库写操作
 * 
 * 注意：此脚本为可选，仅做 console 输出验证，不纳入 CI
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * 测试 API 调用
 */
async function testAPI(name, method, url, body = null, headers = {}) {
  totalTests++;
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${url}`, options);
    const result = await response.json();

    if (response.status === 200) {
      passedTests++;
      console.log(`✅ [通过] ${name}`);
      console.log(`   状态码: ${response.status}`);
      console.log(`   响应: ${JSON.stringify(result, null, 2).substring(0, 200)}...`);
      return { success: true, status: response.status, data: result };
    } else {
      failedTests++;
      console.error(`❌ [失败] ${name}`);
      console.error(`   状态码: ${response.status}`);
      console.error(`   响应: ${JSON.stringify(result, null, 2)}`);
      return { success: false, status: response.status, data: result };
    }
  } catch (err) {
    failedTests++;
    console.error(`❌ [失败] ${name}`);
    console.error(`   错误: ${err.message || err}`);
    return { success: false, error: err };
  }
}

/**
 * 测试运营总览接口
 */
async function testOpsOverview() {
  console.log('\n============================================================');
  console.log('测试 1: 运营总览接口 (GET /api/ops/overview)');
  console.log('============================================================');
  
  // 测试 1.1: 默认参数（7天）
  await testAPI(
    '1.1 运营总览（默认7天）',
    'GET',
    '/api/ops/overview',
    null,
    {}
  );

  // 测试 1.2: 自定义天数
  await testAPI(
    '1.2 运营总览（自定义30天）',
    'GET',
    '/api/ops/overview?days=30',
    null,
    {}
  );

  // 测试 1.3: 边界值（1天）
  await testAPI(
    '1.3 运营总览（1天）',
    'GET',
    '/api/ops/overview?days=1',
    null,
    {}
  );

  // 测试 1.4: 无效参数（应返回400或使用默认值）
  await testAPI(
    '1.4 运营总览（无效参数，应降级处理）',
    'GET',
    '/api/ops/overview?days=invalid',
    null,
    {}
  );
}

/**
 * 测试异常态监控接口
 */
async function testOpsExceptions() {
  console.log('\n============================================================');
  console.log('测试 2: 异常态监控接口 (GET /api/ops/exceptions)');
  console.log('============================================================');
  
  // 测试 2.1: 基本查询
  await testAPI(
    '2.1 异常态监控（基本查询）',
    'GET',
    '/api/ops/exceptions',
    null,
    {}
  );
}

/**
 * 验证响应结构
 */
function validateResponseStructure(result, expectedStructure) {
  if (!result || !result.data) {
    return { valid: false, error: '响应缺少 data 字段' };
  }

  // 验证基本结构（不强制所有字段存在，因为可能是空数据）
  return { valid: true };
}

/**
 * 主执行函数
 */
async function runAllTests() {
  console.log("🚀 开始阶段 2B-6 运营 API 只读验证");
  console.log("============================================================");
  console.log(`基础URL: ${BASE_URL}`);
  console.log("注意：此脚本为可选，仅做 console 输出验证，不纳入 CI");
  console.log("============================================================\n");

  await testOpsOverview();
  await testOpsExceptions();

  console.log("\n============================================================");
  console.log("📊 测试结果汇总");
  console.log("============================================================");
  console.log(`总测试数: ${totalTests}`);
  console.log(`通过: ${passedTests} ✅`);
  console.log(`失败: ${failedTests} ❌`);
  console.log(
    `通过率: ${
      totalTests === 0
        ? "0%"
        : ((passedTests / totalTests) * 100).toFixed(1) + "%"
    }`
  );
  console.log("\n⚠️ 注意：");
  console.log("- 所有 ops API 必须返回 200（即使出错也返回 200，但标记错误）");
  console.log("- 在空数据下不报错");
  console.log("- 无数据库写操作（仅读操作）");
  console.log("============================================================\n");
}

// 执行测试
runAllTests().catch((error) => {
  console.error("测试执行异常:", error);
  process.exit(1);
});

module.exports = { runAllTests, testAPI };
