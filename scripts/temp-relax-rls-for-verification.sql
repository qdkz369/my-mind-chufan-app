-- ============================================
-- 临时放宽RLS策略（仅用于阶段2B-3验证）
-- ⚠️ 警告：验证完成后必须恢复正确的RLS策略
-- ============================================

-- repair_orders 表：临时允许所有插入和查询
DROP POLICY IF EXISTS "Users can create repair orders for their restaurant" ON repair_orders;
CREATE POLICY "Users can create repair orders for their restaurant"
  ON repair_orders FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view repair orders of their restaurant" ON repair_orders;
CREATE POLICY "Users can view repair orders of their restaurant"
  ON repair_orders FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins and assigned workers can update repair orders" ON repair_orders;
CREATE POLICY "Admins and assigned workers can update repair orders"
  ON repair_orders FOR UPDATE
  USING (true);

-- delivery_orders 表：临时允许所有插入和查询
DROP POLICY IF EXISTS "Users can create delivery orders for their restaurant" ON delivery_orders;
CREATE POLICY "Users can create delivery orders for their restaurant"
  ON delivery_orders FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view delivery orders of their restaurant" ON delivery_orders;
CREATE POLICY "Users can view delivery orders of their restaurant"
  ON delivery_orders FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins and assigned delivery workers can update delivery orders" ON delivery_orders;
CREATE POLICY "Admins and assigned delivery workers can update delivery orders"
  ON delivery_orders FOR UPDATE
  USING (true);

-- 验证策略已创建
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('repair_orders', 'delivery_orders')
ORDER BY tablename, policyname;
