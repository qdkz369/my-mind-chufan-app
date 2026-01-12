-- ============================================
-- 阶段 2B-3 数据一致性验证 SQL 脚本
-- 请在 Supabase Dashboard 的 SQL Editor 中执行
-- ============================================

-- 1. 统计新表数据量
SELECT 
  'repair_orders' as table_name,
  COUNT(*) as total_count
FROM repair_orders
UNION ALL
SELECT 
  'delivery_orders' as table_name,
  COUNT(*) as total_count
FROM delivery_orders;

-- 2. 对比原 orders 表拆分逻辑
SELECT 
  '数据迁移对比' as check_type,
  (SELECT COUNT(*) FROM repair_orders) AS repair_orders_count,
  (SELECT COUNT(*) FROM delivery_orders) AS delivery_orders_count,
  (SELECT COUNT(*) FILTER (WHERE service_type IN ('维修服务', '清洁服务', '工程改造')) FROM orders) AS orders_repair_count,
  (SELECT COUNT(*) FILTER (WHERE service_type = '燃料配送') FROM orders) AS orders_delivery_count,
  (SELECT COUNT(*) FROM repair_orders) - (SELECT COUNT(*) FILTER (WHERE service_type IN ('维修服务', '清洁服务', '工程改造')) FROM orders) AS repair_diff,
  (SELECT COUNT(*) FROM delivery_orders) - (SELECT COUNT(*) FILTER (WHERE service_type = '燃料配送') FROM orders) AS delivery_diff;

-- 3. 检查 NULL 值（修复除零错误）
SELECT 
  'repair_orders' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE restaurant_id IS NULL) as null_restaurant_id,
  COUNT(*) FILTER (WHERE service_type IS NULL) as null_service_type,
  COUNT(*) FILTER (WHERE status IS NULL) as null_status,
  CASE 
    WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(*) FILTER (WHERE restaurant_id IS NULL) / COUNT(*), 2)
    ELSE 0
  END as null_restaurant_id_pct,
  CASE 
    WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(*) FILTER (WHERE service_type IS NULL) / COUNT(*), 2)
    ELSE 0
  END as null_service_type_pct,
  CASE 
    WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status IS NULL) / COUNT(*), 2)
    ELSE 0
  END as null_status_pct
FROM repair_orders
UNION ALL
SELECT 
  'delivery_orders' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE restaurant_id IS NULL) as null_restaurant_id,
  COUNT(*) FILTER (WHERE service_type IS NULL) as null_service_type,
  COUNT(*) FILTER (WHERE status IS NULL) as null_status,
  CASE 
    WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(*) FILTER (WHERE restaurant_id IS NULL) / COUNT(*), 2)
    ELSE 0
  END as null_restaurant_id_pct,
  CASE 
    WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(*) FILTER (WHERE service_type IS NULL) / COUNT(*), 2)
    ELSE 0
  END as null_service_type_pct,
  CASE 
    WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status IS NULL) / COUNT(*), 2)
    ELSE 0
  END as null_status_pct
FROM delivery_orders;

-- 4. 数据完整性检查（修复空表时的 MIN/MAX 错误）
SELECT 
  'repair_orders' as table_name,
  COUNT(*) as total,
  COUNT(DISTINCT restaurant_id) as unique_restaurants,
  COUNT(DISTINCT service_type) as unique_service_types,
  COUNT(DISTINCT status) as unique_statuses,
  CASE WHEN COUNT(*) > 0 THEN MIN(created_at) ELSE NULL END as earliest_record,
  CASE WHEN COUNT(*) > 0 THEN MAX(created_at) ELSE NULL END as latest_record
FROM repair_orders
UNION ALL
SELECT 
  'delivery_orders' as table_name,
  COUNT(*) as total,
  COUNT(DISTINCT restaurant_id) as unique_restaurants,
  COUNT(DISTINCT service_type) as unique_service_types,
  COUNT(DISTINCT status) as unique_statuses,
  CASE WHEN COUNT(*) > 0 THEN MIN(created_at) ELSE NULL END as earliest_record,
  CASE WHEN COUNT(*) > 0 THEN MAX(created_at) ELSE NULL END as latest_record
FROM delivery_orders;

-- 5. 检查表结构是否正确
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('repair_orders', 'delivery_orders')
ORDER BY table_name, ordinal_position;

-- 6. 检查索引是否存在
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('repair_orders', 'delivery_orders')
ORDER BY tablename, indexname;

-- 7. 检查 RLS 策略是否存在
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
WHERE schemaname = 'public'
  AND tablename IN ('repair_orders', 'delivery_orders')
ORDER BY tablename, policyname;
