-- ============================================
-- 修复订单主表同步问题
-- 将 delivery_orders 表中的订单同步到 order_main 表
-- ============================================

-- 步骤1：检查需要同步的订单
SELECT 
  d.id,
  d.restaurant_id,
  d.company_id,
  d.service_type,
  d.status,
  d.amount,
  d.created_at,
  d.main_order_id,
  r.company_id as restaurant_company_id
FROM delivery_orders d
LEFT JOIN restaurants r ON d.restaurant_id = r.id
WHERE d.restaurant_id = '4481f1d6-dda4-460b-a380-69d80f2ea876'
  AND d.main_order_id IS NULL
ORDER BY d.created_at DESC;

-- 步骤2：为每个订单生成订单号（如果不存在）
-- 注意：delivery_orders 表可能没有 order_number 字段，需要生成
-- 这里假设需要生成订单号

-- 步骤2.5：检查并添加缺失的字段（如果 order_main 表缺少 notes 字段）
DO $$
BEGIN
  -- 检查 notes 字段是否存在
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_main' 
    AND column_name = 'notes'
  ) THEN
    -- 添加 notes 字段
    ALTER TABLE order_main ADD COLUMN notes TEXT;
    RAISE NOTICE '✅ 已添加 notes 字段到 order_main 表';
  ELSE
    RAISE NOTICE '✅ order_main 表已包含 notes 字段';
  END IF;
END $$;

-- 步骤3：批量同步订单到 order_main 表
-- ⚠️ 重要：此操作必须使用 Service Role Key 执行（绕过 RLS）
-- 使用 DO 块确保订单号唯一性
DO $$
DECLARE
  delivery_record RECORD;
  order_num TEXT;
  new_main_order_id UUID;  -- 重命名变量避免与列名冲突
  has_notes_column BOOLEAN;
BEGIN
  -- 检查 notes 字段是否存在
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_main' 
    AND column_name = 'notes'
  ) INTO has_notes_column;
  
  FOR delivery_record IN 
    SELECT 
      d.id,
      d.restaurant_id,
      d.company_id,
      d.status,
      d.amount,
      d.notes,
      d.created_at,
      d.updated_at,
      r.company_id as restaurant_company_id
    FROM delivery_orders d
    LEFT JOIN restaurants r ON d.restaurant_id = r.id
    WHERE d.restaurant_id = '4481f1d6-dda4-460b-a380-69d80f2ea876'
      AND d.main_order_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM order_main WHERE fuel_order_id = d.id
      )
    ORDER BY d.created_at ASC
  LOOP
    -- 生成唯一订单号：FUEL + 时间戳（秒） + UUID片段
    -- 使用 delivery_orders.id 的前8位作为随机字符串的一部分，确保唯一性
    order_num := 'FUEL' || 
                 EXTRACT(EPOCH FROM delivery_record.created_at)::BIGINT || 
                 SUBSTRING(REPLACE(delivery_record.id::TEXT, '-', '') FROM 1 FOR 8);
    
    -- 如果订单号已存在，添加后缀
    WHILE EXISTS (SELECT 1 FROM order_main WHERE order_number = order_num) LOOP
      order_num := order_num || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    END LOOP;
    
    -- 根据字段是否存在，动态构建 INSERT 语句
    IF has_notes_column THEN
      -- 插入 order_main 记录（包含 notes 字段）
      INSERT INTO order_main (
        order_number,
        order_type,
        company_id,
        status,
        total_amount,
        fuel_order_id,
        rental_order_id,
        restaurant_id,
        user_id,
        notes,
        created_at,
        updated_at
      ) VALUES (
        order_num,
        'fuel',
        COALESCE(delivery_record.company_id, delivery_record.restaurant_company_id),
        delivery_record.status,
        delivery_record.amount,
        delivery_record.id,
        NULL,
        delivery_record.restaurant_id,
        NULL,
        delivery_record.notes,
        delivery_record.created_at,
        delivery_record.updated_at
      ) RETURNING id INTO new_main_order_id;
    ELSE
      -- 插入 order_main 记录（不包含 notes 字段）
      INSERT INTO order_main (
        order_number,
        order_type,
        company_id,
        status,
        total_amount,
        fuel_order_id,
        rental_order_id,
        restaurant_id,
        user_id,
        created_at,
        updated_at
      ) VALUES (
        order_num,
        'fuel',
        COALESCE(delivery_record.company_id, delivery_record.restaurant_company_id),
        delivery_record.status,
        delivery_record.amount,
        delivery_record.id,
        NULL,
        delivery_record.restaurant_id,
        NULL,
        delivery_record.created_at,
        delivery_record.updated_at
      ) RETURNING id INTO new_main_order_id;
    END IF;
    
    -- 更新 delivery_orders 表的 main_order_id
    -- 使用重命名的变量避免与列名冲突
    UPDATE delivery_orders
    SET main_order_id = new_main_order_id
    WHERE id = delivery_record.id;
    
    RAISE NOTICE '✅ 同步订单: delivery_id=%, main_id=%, order_number=%', 
      delivery_record.id, new_main_order_id, order_num;
  END LOOP;
END $$;

-- 步骤4：更新 delivery_orders 表的 main_order_id
UPDATE delivery_orders d
SET main_order_id = m.id
FROM order_main m
WHERE m.fuel_order_id = d.id
  AND d.main_order_id IS NULL
  AND d.restaurant_id = '4481f1d6-dda4-460b-a380-69d80f2ea876';

-- 步骤5：验证同步结果
SELECT 
  d.id as delivery_id,
  d.restaurant_id,
  d.main_order_id,
  m.id as main_id,
  m.order_number,
  m.order_type,
  m.status,
  m.total_amount,
  CASE 
    WHEN d.main_order_id IS NULL THEN '❌ 未关联'
    WHEN m.id IS NULL THEN '❌ 主表记录不存在'
    ELSE '✅ 已正确关联'
  END as sync_status
FROM delivery_orders d
LEFT JOIN order_main m ON d.main_order_id = m.id
WHERE d.restaurant_id = '4481f1d6-dda4-460b-a380-69d80f2ea876'
ORDER BY d.created_at DESC;

-- 步骤6：统计同步结果
SELECT 
  'delivery_orders' as table_name,
  COUNT(*) as total_count,
  COUNT(main_order_id) as synced_count,
  COUNT(*) - COUNT(main_order_id) as unsynced_count
FROM delivery_orders
WHERE restaurant_id = '4481f1d6-dda4-460b-a380-69d80f2ea876'
UNION ALL
SELECT 
  'order_main' as table_name,
  COUNT(*) as total_count,
  COUNT(fuel_order_id) as synced_count,
  0 as unsynced_count
FROM order_main
WHERE restaurant_id = '4481f1d6-dda4-460b-a380-69d80f2ea876';

-- ============================================
-- 注意事项
-- ============================================
-- 1. 此脚本需要使用 Service Role Key 执行（绕过 RLS）
-- 2. 如果 order_number 重复，插入会失败，需要检查唯一约束
-- 3. 执行前建议先备份数据
-- 4. 如果 delivery_orders 表有 order_number 字段，需要修改生成逻辑
