-- ============================================
-- 插入测试报修工单数据
-- 用于测试报修管理功能
-- ============================================

-- 1. 检查是否有餐厅数据
DO $$
DECLARE
  restaurant_count INTEGER;
  test_restaurant_id UUID;
BEGIN
  -- 获取餐厅数量
  SELECT COUNT(*) INTO restaurant_count FROM restaurants;
  
  IF restaurant_count = 0 THEN
    RAISE NOTICE '⚠️ 没有餐厅数据，无法创建报修工单';
    RAISE NOTICE '请先创建餐厅数据';
  ELSE
    -- 获取第一个餐厅ID
    SELECT id INTO test_restaurant_id FROM restaurants LIMIT 1;
    RAISE NOTICE '✅ 找到 % 个餐厅，使用餐厅ID: %', restaurant_count, test_restaurant_id;
    
    -- 插入测试报修工单
    INSERT INTO repair_orders (
      id,
      restaurant_id,
      service_type,
      status,
      description,
      amount,
      created_at,
      updated_at
    ) VALUES
    (
      gen_random_uuid(),
      test_restaurant_id,
      '维修服务',
      'pending',
      '测试报修工单1：设备故障需要维修',
      0,
      NOW() - INTERVAL '2 days',
      NOW() - INTERVAL '2 days'
    ),
    (
      gen_random_uuid(),
      test_restaurant_id,
      '维修服务',
      'processing',
      '测试报修工单2：正在处理中的维修',
      150.00,
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '12 hours'
    ),
    (
      gen_random_uuid(),
      test_restaurant_id,
      '清洁服务',
      'completed',
      '测试报修工单3：已完成清洁服务',
      80.00,
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '2 days'
    ),
    (
      gen_random_uuid(),
      test_restaurant_id,
      '工程改造',
      'pending',
      '测试报修工单4：需要工程改造',
      0,
      NOW() - INTERVAL '5 hours',
      NOW() - INTERVAL '5 hours'
    ),
    (
      gen_random_uuid(),
      test_restaurant_id,
      '维修服务',
      'cancelled',
      '测试报修工单5：已取消的维修',
      0,
      NOW() - INTERVAL '4 days',
      NOW() - INTERVAL '3 days'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ 已插入5条测试报修工单';
  END IF;
END $$;

-- 2. 验证插入的数据
SELECT 
  'repair_orders 表数据统计' AS info,
  COUNT(*) AS total_count,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE status = 'processing') AS processing_count,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count
FROM repair_orders;

-- 3. 显示最近5条报修工单
SELECT 
  id,
  restaurant_id,
  service_type,
  status,
  description,
  amount,
  created_at
FROM repair_orders
ORDER BY created_at DESC
LIMIT 5;
