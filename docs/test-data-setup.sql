-- ============================================
-- 全链路测试模拟数据预设脚本
-- ============================================
-- 请在 Supabase SQL Editor 中执行此脚本
-- ============================================

-- 1. 预设测试设备数据
-- 如果 devices 表不存在，请先创建表
-- 如果表已存在，使用 INSERT ... ON CONFLICT 确保数据存在

INSERT INTO devices (device_id, model, address, installer, install_date, status, restaurant_id)
VALUES 
  ('TEST-DEV-001', '智能燃料监控系统 V2.0', '昆明市五华区测试路001号', '测试安装员A', NOW(), 'ready', NULL),
  ('TEST-DEV-002', '智能燃料监控系统 V2.0', '昆明市盘龙区测试路002号', '测试安装员B', NOW(), 'ready', NULL),
  ('TEST-DEV-003', '智能燃料监控系统 V2.0', '昆明市官渡区测试路003号', '测试安装员C', NOW(), 'ready', NULL)
ON CONFLICT (device_id) DO UPDATE SET
  model = EXCLUDED.model,
  address = EXCLUDED.address,
  installer = EXCLUDED.installer,
  status = 'ready',
  updated_at = NOW();

-- 2. 确保 orders 表有必要的字段（如果还没有）
-- 注意：这些 ALTER TABLE 语句如果字段已存在会报错，可以忽略

DO $$ 
BEGIN
  -- 添加产品类型字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'product_type') THEN
    ALTER TABLE orders ADD COLUMN product_type VARCHAR(50);
  END IF;

  -- 添加指派配送员ID字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'assigned_to') THEN
    ALTER TABLE orders ADD COLUMN assigned_to UUID;
  END IF;

  -- 添加瓶身溯源二维码字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'tracking_code') THEN
    ALTER TABLE orders ADD COLUMN tracking_code TEXT;
  END IF;

  -- 添加配送图片凭证URL字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'proof_image') THEN
    ALTER TABLE orders ADD COLUMN proof_image TEXT;
  END IF;

  -- 添加客户确认验收字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'customer_confirmed') THEN
    ALTER TABLE orders ADD COLUMN customer_confirmed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 3. 创建测试餐厅（如果不存在）
-- 注意：请根据实际情况修改 restaurant_id
INSERT INTO restaurants (id, name, contact_name, contact_phone, address, status, qr_token, total_refilled)
VALUES 
  (
    gen_random_uuid(),
    '测试餐厅001',
    '测试负责人',
    '13800138001',
    '昆明市五华区测试路001号',
    'unactivated',
    'test_qr_token_001',
    0
  )
ON CONFLICT (id) DO NOTHING;

-- 4. 创建测试配送员（如果 workers 表存在）
-- 注意：如果 workers 表不存在，可以忽略这部分
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workers') THEN
    INSERT INTO workers (id, name, phone, status)
    VALUES 
      ('worker_001', '测试配送员A', '13800138002', 'active'),
      ('worker_002', '测试配送员B', '13800138003', 'active')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      status = 'active';
  END IF;
END $$;

-- 5. 验证数据
SELECT '设备数据' as type, COUNT(*) as count FROM devices WHERE device_id LIKE 'TEST-DEV-%'
UNION ALL
SELECT '测试餐厅', COUNT(*) FROM restaurants WHERE name LIKE '测试%'
UNION ALL
SELECT '测试配送员', COUNT(*) FROM workers WHERE id LIKE 'worker_%';

