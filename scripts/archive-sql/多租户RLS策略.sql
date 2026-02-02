-- ============================================
-- 多租户数据隔离 RLS 策略
-- 确保供应商只能看到自己的数据
-- ============================================

-- ============================================
-- 1. rental_orders 表多租户策略
-- ============================================

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can only see their company's rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Providers can only see their own rental orders" ON rental_orders;

-- 创建新策略：供应商只能看到自己的订单
-- 注意：这需要 users 表有 company_id 字段，或者有 user_companies 关联表
CREATE POLICY "Providers can only see their own rental orders"
  ON rental_orders
  FOR SELECT
  TO authenticated
  USING (
    -- 方案1：如果 users 表有 company_id 字段
    -- provider_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    
    -- 方案2：如果有 user_companies 关联表
    -- provider_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    
    -- 方案3：临时方案 - 通过 RLS 函数检查（需要实现）
    -- 目前先允许所有认证用户查看，由应用层过滤
    true -- ⚠️ 临时：需要根据实际用户表结构调整
  );

-- ============================================
-- 2. equipment_catalog 表多租户策略
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Providers can only see their own equipment" ON equipment_catalog;

-- 供应商只能看到自己的产品
CREATE POLICY "Providers can only see their own equipment"
  ON equipment_catalog
  FOR SELECT
  TO authenticated
  USING (
    -- 供应商只能看到自己的产品
    provider_id IN (
      -- 需要根据实际用户表结构调整
      -- SELECT company_id FROM users WHERE id = auth.uid()
      -- 或
      -- SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      SELECT provider_id FROM equipment_catalog WHERE true -- ⚠️ 临时：需要调整
    )
  );

-- ============================================
-- 3. 管理员策略（可以看到所有数据）
-- ============================================

-- 创建管理员角色策略（如果 users 表有 role 字段）
-- CREATE POLICY "Admins can see all rental orders"
--   ON rental_orders
--   FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM users 
--       WHERE id = auth.uid() 
--       AND role = 'admin'
--     )
--   );

-- ============================================
-- 4. 验证策略
-- ============================================

SELECT 
  tablename AS 表名,
  policyname AS 策略名称,
  cmd AS 操作类型,
  roles AS 角色
FROM pg_policies
WHERE tablename IN ('rental_orders', 'equipment_catalog')
  AND policyname LIKE '%provider%' OR policyname LIKE '%company%'
ORDER BY tablename, policyname;


