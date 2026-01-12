-- ============================================
-- 彻底修复 rental_orders 表权限问题
-- 确保服务角色和认证用户都能访问
-- ============================================

-- 1. 确认表存在
SELECT 'rental_orders 表状态检查' AS step;
SELECT 
  tablename,
  schemaname,
  tableowner
FROM pg_tables 
WHERE tablename = 'rental_orders';

-- 2. 删除所有现有策略（重新开始）
SELECT '删除现有策略' AS step;
DROP POLICY IF EXISTS "Users can view their own rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Users can create their own rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Users can update their own rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Admin can view all rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Allow all authenticated users to view rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Service role can access all rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can view rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can insert rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can update rental orders" ON rental_orders;

-- 3. 临时禁用 RLS（用于测试，确保表可以访问）
SELECT '临时禁用 RLS 进行测试' AS step;
ALTER TABLE rental_orders DISABLE ROW LEVEL SECURITY;

-- 4. 测试查询（应该能成功）
SELECT '测试查询' AS step;
SELECT COUNT(*) AS total_orders FROM rental_orders;

-- 5. 重新启用 RLS
SELECT '重新启用 RLS' AS step;
ALTER TABLE rental_orders ENABLE ROW LEVEL SECURITY;

-- 6. 删除可能存在的策略（避免重复创建错误）
SELECT '删除现有策略（如果存在）' AS step;
DROP POLICY IF EXISTS "Service role full access to rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can view all rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can insert rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can update rental orders" ON rental_orders;

-- 7. 创建允许服务角色完全访问的策略（最重要！）
SELECT '创建服务角色策略' AS step;
CREATE POLICY "Service role full access to rental orders"
  ON rental_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. 创建允许认证用户查看所有订单的策略（用于管理端）
SELECT '创建认证用户查看策略' AS step;
CREATE POLICY "Authenticated users can view all rental orders"
  ON rental_orders
  FOR SELECT
  TO authenticated
  USING (true);

-- 9. 创建允许认证用户插入的策略
SELECT '创建认证用户插入策略' AS step;
CREATE POLICY "Authenticated users can insert rental orders"
  ON rental_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 10. 创建允许认证用户更新的策略
SELECT '创建认证用户更新策略' AS step;
CREATE POLICY "Authenticated users can update rental orders"
  ON rental_orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 11. 验证所有策略
SELECT '验证策略' AS step;
SELECT 
  policyname,
  cmd AS command,
  roles,
  CASE 
    WHEN roles = '{service_role}' THEN '✅ 服务角色'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户'
    ELSE roles::text
  END AS role_description
FROM pg_policies 
WHERE tablename = 'rental_orders'
ORDER BY policyname;

-- 12. 最终测试
SELECT '最终测试' AS step;
SELECT 
  '✅ 表存在' AS status,
  COUNT(*) AS total_orders
FROM rental_orders;

