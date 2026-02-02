-- ============================================
-- 检查 rental_orders 表是否存在和权限问题
-- ============================================

-- 1. 检查表是否存在（所有 schema）
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'rental_orders'
ORDER BY table_schema;

-- 2. 检查 public schema 中的表
SELECT 
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('rental_orders', 'equipment', 'equipment_categories')
ORDER BY table_name;

-- 3. 检查表的 RLS 状态
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE tablename = 'rental_orders';

-- 4. 检查 RLS 策略
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
WHERE tablename = 'rental_orders';

-- 5. 尝试直接查询表（如果有权限）
SELECT COUNT(*) AS total_orders FROM rental_orders;

-- 6. 检查表的所有者
SELECT 
  t.tablename,
  t.tableowner,
  t.schemaname
FROM pg_tables t
WHERE t.tablename = 'rental_orders';


