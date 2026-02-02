-- ============================================
-- 快速验证并修复 rental_orders 和 rentals 表的 RLS 策略
-- ============================================

-- ============================================
-- 第一部分：rental_orders 表
-- ============================================

-- 1. 查看 rental_orders 当前策略数量
SELECT 
  'rental_orders 当前策略数量' AS 检查项,
  COUNT(*) AS 策略数量
FROM pg_policies 
WHERE tablename = 'rental_orders';

-- 2. 列出 rental_orders 所有策略详情
SELECT 
  'rental_orders' AS 表名,
  policyname AS 策略名称,
  cmd AS 操作类型,
  roles AS 角色,
  CASE
    WHEN roles = '{service_role}' THEN '✅ 服务角色（API使用）'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户（前端使用）'
    ELSE roles::text
  END AS 角色说明
FROM pg_policies 
WHERE tablename = 'rental_orders'
ORDER BY policyname;

-- 3. 删除 rental_orders 可能存在的旧策略（避免重复创建错误）
DROP POLICY IF EXISTS "Service role full access to rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can view all rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can insert rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can update rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Users can view their own rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Users can create their own rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Users can update their own rental orders" ON rental_orders;

-- 4. 创建 rental_orders 服务角色策略（最重要！API 使用这个）
CREATE POLICY "Service role full access to rental orders"
  ON rental_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. 创建 rental_orders 认证用户查看策略（管理端使用）
CREATE POLICY "Authenticated users can view all rental orders"
  ON rental_orders
  FOR SELECT
  TO authenticated
  USING (true);

-- 6. 创建 rental_orders 认证用户插入策略
CREATE POLICY "Authenticated users can insert rental orders"
  ON rental_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 7. 创建 rental_orders 认证用户更新策略
CREATE POLICY "Authenticated users can update rental orders"
  ON rental_orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 第二部分：rentals 表
-- ============================================

-- 8. 查看 rentals 当前策略数量
SELECT 
  'rentals 当前策略数量' AS 检查项,
  COUNT(*) AS 策略数量
FROM pg_policies 
WHERE tablename = 'rentals';

-- 9. 列出 rentals 所有策略详情
SELECT 
  'rentals' AS 表名,
  policyname AS 策略名称,
  cmd AS 操作类型,
  roles AS 角色,
  CASE
    WHEN roles = '{service_role}' THEN '✅ 服务角色（API使用）'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户（前端使用）'
    ELSE roles::text
  END AS 角色说明
FROM pg_policies 
WHERE tablename = 'rentals'
ORDER BY policyname;

-- 10. 删除 rentals 可能存在的旧策略（避免重复创建错误）
DROP POLICY IF EXISTS "Service role full access to rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow authenticated users to view all rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow authenticated users to create rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow authenticated users to update rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow authenticated users to delete rentals" ON public.rentals;

-- 11. 创建 rentals 服务角色策略（最重要！API 使用这个）
CREATE POLICY "Service role full access to rentals"
  ON public.rentals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 12. 创建 rentals 认证用户查看策略（管理端使用）
CREATE POLICY "Allow authenticated users to view all rentals"
  ON public.rentals
  FOR SELECT
  TO authenticated
  USING (true);

-- 13. 创建 rentals 认证用户插入策略
CREATE POLICY "Allow authenticated users to create rentals"
  ON public.rentals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 14. 创建 rentals 认证用户更新策略
CREATE POLICY "Allow authenticated users to update rentals"
  ON public.rentals
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 15. 创建 rentals 认证用户删除策略
CREATE POLICY "Allow authenticated users to delete rentals"
  ON public.rentals
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 第三部分：验证所有策略
-- ============================================

-- 16. 验证 rental_orders 策略创建结果
SELECT 
  'rental_orders' AS 表名,
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE
    WHEN roles = '{service_role}' THEN '✅ 服务角色（API使用）'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户（前端使用）'
    ELSE roles::text
  END AS 角色说明
FROM pg_policies
WHERE tablename = 'rental_orders'
ORDER BY policyname;

-- 17. 验证 rentals 策略创建结果
SELECT 
  'rentals' AS 表名,
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE
    WHEN roles = '{service_role}' THEN '✅ 服务角色（API使用）'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户（前端使用）'
    ELSE roles::text
  END AS 角色说明
FROM pg_policies
WHERE tablename = 'rentals'
ORDER BY policyname;

-- 18. 最终统计
SELECT 
  tablename AS 表名,
  COUNT(*) AS 策略总数,
  COUNT(CASE WHEN roles = '{service_role}' THEN 1 END) AS 服务角色策略数,
  COUNT(CASE WHEN roles = '{authenticated}' THEN 1 END) AS 认证用户策略数
FROM pg_policies
WHERE tablename IN ('rental_orders', 'rentals')
GROUP BY tablename
ORDER BY tablename;


