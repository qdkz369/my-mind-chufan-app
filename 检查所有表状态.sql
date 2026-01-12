-- ============================================
-- 检查所有重要表是否存在
-- ============================================

-- 1. 检查核心业务表
SELECT 
  '核心业务表' AS 表类型,
  table_name AS 表名,
  CASE 
    WHEN table_name IN ('orders', 'restaurants', 'devices', 'workers') THEN '✅ 核心表'
    ELSE '⚠️ 业务表'
  END AS 重要性
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'orders',           -- 订单表（维修、配送等）
    'restaurants',      -- 餐厅信息表
    'devices',          -- 设备表
    'workers',          -- 工人表
    'service_points'    -- 服务点表
  )
ORDER BY 
  CASE table_name
    WHEN 'orders' THEN 1
    WHEN 'restaurants' THEN 2
    WHEN 'devices' THEN 3
    WHEN 'workers' THEN 4
    WHEN 'service_points' THEN 5
  END;

-- 2. 检查设备租赁相关表
SELECT 
  '设备租赁表' AS 表类型,
  table_name AS 表名,
  CASE 
    WHEN table_name = 'rental_orders' THEN '⚠️ 已被删除（需要重建）'
    WHEN table_name = 'rentals' THEN '✅ 租赁管理表（新）'
    WHEN table_name IN ('equipment', 'equipment_categories') THEN '✅ 设备基础表'
    ELSE '❓ 未知表'
  END AS 状态
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'rental_orders',        -- 设备租赁订单表（已被删除）
    'rentals',              -- 租赁管理表（新）
    'equipment',            -- 设备表
    'equipment_categories'  -- 设备分类表
  )
ORDER BY table_name;

-- 3. 检查所有表（完整列表）
SELECT 
  table_name AS 表名,
  CASE 
    WHEN table_name IN ('orders', 'restaurants', 'devices', 'workers', 'service_points') THEN '✅ 核心表'
    WHEN table_name IN ('equipment', 'equipment_categories', 'rentals') THEN '✅ 业务表'
    WHEN table_name IN ('rental_orders') THEN '⚠️ 已删除（需重建）'
    WHEN table_name LIKE '%_old' OR table_name LIKE '%_backup' OR table_name LIKE '%_temp' THEN '🗑️ 废弃表'
    ELSE '❓ 其他表'
  END AS 状态,
  (SELECT COUNT(*) 
   FROM information_schema.columns 
   WHERE table_name = t.table_name 
     AND table_schema = 'public') AS 字段数
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY 
  CASE 
    WHEN table_name IN ('orders', 'restaurants', 'devices', 'workers') THEN 1
    WHEN table_name IN ('equipment', 'equipment_categories', 'rentals') THEN 2
    WHEN table_name = 'rental_orders' THEN 3
    ELSE 4
  END,
  table_name;

-- 4. 检查 rental_orders 表是否存在（重点）
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'rental_orders'
    ) THEN '✅ rental_orders 表存在'
    ELSE '❌ rental_orders 表不存在（已被删除）'
  END AS 检查结果;

-- 5. 检查 rentals 表是否存在
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'rentals'
    ) THEN '✅ rentals 表存在'
    ELSE '❌ rentals 表不存在'
  END AS 检查结果;


