-- ============================================
-- 诊断订单列表为空问题
-- 用于检查订单数据是否正确创建和同步
-- ============================================

-- 1. 检查 delivery_orders 表中是否有该餐厅的订单
SELECT 
  id,
  restaurant_id,
  company_id,
  service_type,
  status,
  amount,
  created_at,
  main_order_id
FROM delivery_orders
WHERE restaurant_id = '4481f1d6-dda4-460b-a380-69d80f2ea876'
ORDER BY created_at DESC
LIMIT 10;

-- 2. 检查 order_main 表中是否有该餐厅的订单
SELECT 
  id,
  order_number,
  order_type,
  restaurant_id,
  company_id,
  status,
  total_amount,
  fuel_order_id,
  rental_order_id,
  created_at
FROM order_main
WHERE restaurant_id = '4481f1d6-dda4-460b-a380-69d80f2ea876'
ORDER BY created_at DESC
LIMIT 10;

-- 3. 检查 delivery_orders 和 order_main 的关联情况
SELECT 
  d.id as delivery_id,
  d.restaurant_id,
  d.company_id as delivery_company_id,
  d.main_order_id,
  d.status as delivery_status,
  d.amount,
  d.created_at as delivery_created_at,
  m.id as main_id,
  m.order_number,
  m.order_type,
  m.company_id as main_company_id,
  m.status as main_status,
  m.total_amount,
  m.created_at as main_created_at,
  CASE 
    WHEN d.main_order_id IS NULL THEN '❌ 未关联主表'
    WHEN m.id IS NULL THEN '❌ 主表记录不存在'
    ELSE '✅ 已正确关联'
  END as association_status
FROM delivery_orders d
LEFT JOIN order_main m ON d.main_order_id = m.id
WHERE d.restaurant_id = '4481f1d6-dda4-460b-a380-69d80f2ea876'
ORDER BY d.created_at DESC
LIMIT 10;

-- 4. 检查餐厅的 company_id 是否正确设置
SELECT 
  id,
  name,
  company_id,
  contact_name,
  contact_phone,
  status
FROM restaurants
WHERE id = '4481f1d6-dda4-460b-a380-69d80f2ea876';

-- 5. 统计该餐厅的订单数量
SELECT 
  'delivery_orders' as table_name,
  COUNT(*) as order_count
FROM delivery_orders
WHERE restaurant_id = '4481f1d6-dda4-460b-a380-69d80f2ea876'
UNION ALL
SELECT 
  'order_main' as table_name,
  COUNT(*) as order_count
FROM order_main
WHERE restaurant_id = '4481f1d6-dda4-460b-a380-69d80f2ea876';

-- ============================================
-- 问题诊断指南
-- ============================================
-- 
-- 情况1：delivery_orders 有记录，但 order_main 没有记录
--   → 说明订单创建成功，但影子写入失败
--   → 解决方案：检查 Service Role Key 配置，检查 order_main 表的 RLS 策略
--
-- 情况2：delivery_orders 和 order_main 都有记录，但 main_order_id 为 NULL
--   → 说明影子写入成功，但关联更新失败
--   → 解决方案：手动更新 main_order_id：
--      UPDATE delivery_orders 
--      SET main_order_id = (SELECT id FROM order_main WHERE fuel_order_id = delivery_orders.id)
--      WHERE main_order_id IS NULL AND restaurant_id = '4481f1d6-dda4-460b-a380-69d80f2ea876';
--
-- 情况3：两个表都没有记录
--   → 说明订单创建失败
--   → 解决方案：检查订单创建 API 的错误日志，确认失败原因
--
-- 情况4：restaurants 表的 company_id 为 NULL
--   → 说明餐厅未关联公司
--   → 解决方案：为餐厅关联公司：
--      UPDATE restaurants 
--      SET company_id = '700de2c8-5489-4154-b27f-fb565c8c5f91'
--      WHERE id = '4481f1d6-dda4-460b-a380-69d80f2ea876';
--
