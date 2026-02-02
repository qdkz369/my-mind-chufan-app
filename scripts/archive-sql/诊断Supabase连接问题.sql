-- ============================================
-- 诊断 Supabase 连接和表问题
-- ============================================

-- 1. 确认表确实存在
SELECT 
  'rental_orders' AS table_name,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rental_orders')
    THEN '✅ 存在'
    ELSE '❌ 不存在'
  END AS status
UNION ALL
SELECT 
  'equipment' AS table_name,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equipment')
    THEN '✅ 存在'
    ELSE '❌ 不存在'
  END AS status
UNION ALL
SELECT 
  'equipment_categories' AS table_name,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equipment_categories')
    THEN '✅ 存在'
    ELSE '❌ 不存在'
  END AS status;

-- 2. 检查表的所有字段
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'rental_orders'
ORDER BY ordinal_position;

-- 3. 检查 RLS 状态
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'rental_orders';

-- 4. 检查所有策略
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'rental_orders';

-- 5. 测试直接查询（使用 postgres 角色）
SELECT COUNT(*) AS total FROM rental_orders;

-- 6. 检查当前数据库和用户
SELECT 
  current_database() AS database_name,
  current_user AS current_user,
  current_schema() AS current_schema;


