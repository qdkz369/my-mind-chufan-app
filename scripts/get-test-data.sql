-- ============================================
-- 获取测试数据 SQL 脚本
-- 用于阶段 2B-3 功能验证
-- ============================================

-- 1. 获取一个测试餐厅 ID
SELECT 
  id as restaurant_id,
  name as restaurant_name,
  address,
  contact_phone
FROM restaurants
LIMIT 1;

-- 2. 获取一个测试工人 ID（如果有）
SELECT 
  id as worker_id,
  name as worker_name,
  phone,
  type
FROM workers
WHERE type = 'delivery' OR type = 'repair'
LIMIT 1;

-- 3. 获取一个测试用户 ID（如果有）
SELECT 
  id as user_id,
  email
FROM auth.users
LIMIT 1;

-- 4. 检查表是否有数据
SELECT 
  'repair_orders' as table_name,
  COUNT(*) as count
FROM repair_orders
UNION ALL
SELECT 
  'delivery_orders' as table_name,
  COUNT(*) as count
FROM delivery_orders
UNION ALL
SELECT 
  'restaurants' as table_name,
  COUNT(*) as count
FROM restaurants
UNION ALL
SELECT 
  'workers' as table_name,
  COUNT(*) as count
FROM workers;
