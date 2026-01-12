-- ============================================
-- 恢复正确的RLS策略（验证完成后执行）
-- ============================================

-- repair_orders 表：恢复正确的RLS策略
DROP POLICY IF EXISTS "Users can create repair orders for their restaurant" ON repair_orders;
CREATE POLICY "Users can create repair orders for their restaurant"
  ON repair_orders FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view repair orders of their restaurant" ON repair_orders;
CREATE POLICY "Users can view repair orders of their restaurant"
  ON repair_orders FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and assigned workers can update repair orders" ON repair_orders;
CREATE POLICY "Admins and assigned workers can update repair orders"
  ON repair_orders FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
    OR assigned_to = auth.uid()::TEXT
  );

-- delivery_orders 表：恢复正确的RLS策略
DROP POLICY IF EXISTS "Users can create delivery orders for their restaurant" ON delivery_orders;
CREATE POLICY "Users can create delivery orders for their restaurant"
  ON delivery_orders FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view delivery orders of their restaurant" ON delivery_orders;
CREATE POLICY "Users can view delivery orders of their restaurant"
  ON delivery_orders FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and assigned delivery workers can update delivery orders" ON delivery_orders;
CREATE POLICY "Admins and assigned delivery workers can update delivery orders"
  ON delivery_orders FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
    OR assigned_to = auth.uid()::TEXT
  );

-- 验证策略已恢复
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
