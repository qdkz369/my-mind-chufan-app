-- ============================================
-- 修复 repair_orders 表的 RLS 策略
-- 允许 service_role 和 super_admin 完全访问
-- ============================================

-- 1. 检查当前的 RLS 状态
SELECT 
  'repair_orders 表 RLS 状态检查' AS step,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE tablename = 'repair_orders';

-- 2. 列出所有现有的策略
SELECT 
  'repair_orders 现有策略' AS step,
  policyname AS 策略名称,
  cmd AS 操作类型,
  roles AS 角色
FROM pg_policies 
WHERE tablename = 'repair_orders'
ORDER BY policyname;

-- 3. 删除所有现有策略（重新开始）
DROP POLICY IF EXISTS "Users can view repair orders of their restaurant" ON repair_orders;
DROP POLICY IF EXISTS "Users can create repair orders for their restaurant" ON repair_orders;
DROP POLICY IF EXISTS "Admins and assigned workers can update repair orders" ON repair_orders;
DROP POLICY IF EXISTS "Service role full access to repair orders" ON repair_orders;
DROP POLICY IF EXISTS "Authenticated users can view all repair orders" ON repair_orders;
DROP POLICY IF EXISTS "Authenticated users can insert repair orders" ON repair_orders;
DROP POLICY IF EXISTS "Authenticated users can update repair orders" ON repair_orders;

-- 4. 确保 RLS 已启用
ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;

-- 5. 创建策略1：服务角色完全访问（API 路由使用，绕过 RLS）
CREATE POLICY "Service role full access to repair orders"
  ON repair_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. 创建策略2：认证用户可以查看所有报修工单（管理端使用）
-- 注意：这允许所有认证用户查看，但实际数据隔离在应用层通过 company_id 实现
CREATE POLICY "Authenticated users can view all repair orders"
  ON repair_orders
  FOR SELECT
  TO authenticated
  USING (true);

-- 7. 创建策略3：认证用户可以插入报修工单
CREATE POLICY "Authenticated users can insert repair orders"
  ON repair_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 8. 创建策略4：认证用户可以更新报修工单
CREATE POLICY "Authenticated users can update repair orders"
  ON repair_orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. 验证策略创建成功
SELECT 
  'repair_orders 策略验证' AS step,
  policyname AS 策略名称,
  cmd AS 操作类型,
  roles AS 角色,
  CASE
    WHEN roles = '{service_role}' THEN '✅ 服务角色（API使用，绕过RLS）'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户（前端使用）'
    ELSE roles::text
  END AS 角色说明
FROM pg_policies 
WHERE tablename = 'repair_orders'
ORDER BY policyname;

-- 10. 测试查询（应该能成功）
SELECT 
  'repair_orders 测试查询' AS step,
  COUNT(*) AS 总记录数
FROM repair_orders;
