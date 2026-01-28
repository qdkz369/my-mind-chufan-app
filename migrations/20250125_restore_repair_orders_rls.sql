-- ============================================
-- 恢复 repair_orders 表的正确 RLS 策略
-- 在临时禁用 RLS 后，使用此脚本恢复
-- ============================================

-- 1. 重新启用 RLS
ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;

-- 2. 删除所有现有策略（重新开始）
DROP POLICY IF EXISTS "Users can view repair orders of their restaurant" ON repair_orders;
DROP POLICY IF EXISTS "Users can create repair orders for their restaurant" ON repair_orders;
DROP POLICY IF EXISTS "Admins and assigned workers can update repair orders" ON repair_orders;
DROP POLICY IF EXISTS "Service role full access to repair orders" ON repair_orders;
DROP POLICY IF EXISTS "Authenticated users can view all repair orders" ON repair_orders;
DROP POLICY IF EXISTS "Authenticated users can insert repair orders" ON repair_orders;
DROP POLICY IF EXISTS "Authenticated users can update repair orders" ON repair_orders;

-- 3. 创建策略1：服务角色完全访问（API 路由使用，绕过 RLS）
CREATE POLICY "Service role full access to repair orders"
  ON repair_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. 创建策略2：认证用户可以查看所有报修工单（管理端使用）
CREATE POLICY "Authenticated users can view all repair orders"
  ON repair_orders
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. 创建策略3：认证用户可以插入报修工单
CREATE POLICY "Authenticated users can insert repair orders"
  ON repair_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. 创建策略4：认证用户可以更新报修工单
CREATE POLICY "Authenticated users can update repair orders"
  ON repair_orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. 验证策略创建成功
SELECT 
  'repair_orders 策略验证' AS step,
  policyname AS 策略名称,
  cmd AS 操作类型,
  roles AS 角色
FROM pg_policies 
WHERE tablename = 'repair_orders'
ORDER BY policyname;
