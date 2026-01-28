-- ============================================
-- 检查表结构
-- 查看指定表的所有列及其数据类型
-- ============================================

SELECT
  table_name AS 表名,
  column_name AS 列名,
  data_type AS 数据类型,
  is_nullable AS 可空,
  column_default AS 默认值,
  character_maximum_length AS 最大长度
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
  'restaurants',
  'workers',
  'suppliers',
  'tenants',
  'agreements',
  'rental_orders',
  'fuel_orders',
  'deliveries'
)
ORDER BY table_name, ordinal_position;

-- ============================================
-- 详细版本：包含更多信息
-- ============================================

SELECT
  t.table_name AS 表名,
  c.column_name AS 列名,
  c.data_type AS 数据类型,
  c.udt_name AS 用户定义类型,
  c.character_maximum_length AS 最大长度,
  c.numeric_precision AS 数值精度,
  c.numeric_scale AS 数值小数位,
  c.is_nullable AS 可空,
  c.column_default AS 默认值,
  c.ordinal_position AS 位置
FROM information_schema.tables t
JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
AND t.table_name IN (
  'restaurants',
  'workers',
  'suppliers',
  'tenants',
  'agreements',
  'rental_orders',
  'fuel_orders',
  'deliveries'
)
ORDER BY t.table_name, c.ordinal_position;

-- ============================================
-- 检查表是否存在
-- ============================================

SELECT
  table_name AS 表名,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name
    )
    THEN '✅ 存在'
    ELSE '❌ 不存在'
  END AS 状态
FROM (
  SELECT unnest(ARRAY[
    'restaurants',
    'workers',
    'suppliers',
    'tenants',
    'agreements',
    'rental_orders',
    'fuel_orders',
    'deliveries'
  ]) AS table_name
) t
ORDER BY table_name;

-- ============================================
-- 检查外键关系
-- ============================================

SELECT
  tc.table_name AS 表名,
  kcu.column_name AS 列名,
  ccu.table_name AS 关联表,
  ccu.column_name AS 关联列,
  tc.constraint_name AS 约束名称
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN (
  'restaurants',
  'workers',
  'suppliers',
  'tenants',
  'agreements',
  'rental_orders',
  'fuel_orders',
  'deliveries'
)
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 检查索引
-- ============================================

SELECT
  t.tablename AS 表名,
  indexname AS 索引名,
  indexdef AS 索引定义
FROM pg_indexes i
JOIN pg_tables t ON i.tablename = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN (
  'restaurants',
  'workers',
  'suppliers',
  'tenants',
  'agreements',
  'rental_orders',
  'fuel_orders',
  'deliveries'
)
ORDER BY t.tablename, indexname;
