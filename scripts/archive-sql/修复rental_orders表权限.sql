-- ============================================
-- 修复 rental_orders 表的 RLS 权限问题
-- ============================================

-- 1. 检查当前的 RLS 状态
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE tablename = 'rental_orders';

-- 2. 检查现有的策略
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'rental_orders';

-- 3. 删除可能冲突的策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Users can create their own rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Users can update their own rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Admin can view all rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Allow all authenticated users to view rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Allow service role to access rental orders" ON rental_orders;

-- 4. 创建允许服务角色（service_role）完全访问的策略
-- 注意：service_role 会绕过 RLS，但为了保险起见，我们也可以创建策略
CREATE POLICY "Service role can access all rental orders"
  ON rental_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. 创建允许认证用户查看的策略（用于前端）
CREATE POLICY "Authenticated users can view rental orders"
  ON rental_orders
  FOR SELECT
  TO authenticated
  USING (true);

-- 6. 创建允许认证用户插入的策略（用于创建订单）
CREATE POLICY "Authenticated users can insert rental orders"
  ON rental_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 7. 创建允许认证用户更新的策略（用于更新订单状态）
CREATE POLICY "Authenticated users can update rental orders"
  ON rental_orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. 验证策略创建成功
SELECT 
  policyname,
  cmd AS command,
  roles
FROM pg_policies 
WHERE tablename = 'rental_orders'
ORDER BY policyname;

-- 9. 测试查询（应该能成功）
SELECT COUNT(*) AS total_orders FROM rental_orders;

-- 10. 如果还是不行，可以临时禁用 RLS 进行测试（不推荐生产环境）
-- ALTER TABLE rental_orders DISABLE ROW LEVEL SECURITY;


