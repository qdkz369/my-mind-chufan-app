-- ============================================
-- 临时禁用 repair_orders 表的 RLS（用于测试和调试）
-- ⚠️ 警告：这会暂时关闭所有 RLS 策略，仅用于测试
-- 生产环境请使用 20250125_fix_repair_orders_rls.sql 来修复策略
-- ============================================

-- 1. 临时禁用 RLS
ALTER TABLE repair_orders DISABLE ROW LEVEL SECURITY;

-- 2. 验证 RLS 已禁用
SELECT 
  'repair_orders RLS 状态' AS step,
  tablename,
  rowsecurity AS rls_enabled,
  CASE 
    WHEN rowsecurity = false THEN '✅ RLS 已禁用'
    ELSE '❌ RLS 仍启用'
  END AS 状态说明
FROM pg_tables 
WHERE tablename = 'repair_orders';

-- 3. 测试查询（应该能成功）
SELECT 
  'repair_orders 测试查询' AS step,
  COUNT(*) AS 总记录数
FROM repair_orders;

-- ============================================
-- 恢复 RLS（测试完成后执行）
-- ============================================
-- ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;
-- 然后运行 20250125_fix_repair_orders_rls.sql 来创建正确的策略
