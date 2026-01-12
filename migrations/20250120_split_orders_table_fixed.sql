-- ============================================
-- 报修工单与燃料配送表拆分迁移脚本（修复版）
-- 创建日期: 2025-01-20
-- 修复: 处理 orders 表可能没有 user_id 字段的情况
-- ============================================

-- ============================================
-- 阶段 0: 检查 orders 表结构
-- ============================================

-- 检查 orders 表是否有 user_id 字段
DO $$
DECLARE
  has_user_id BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'user_id'
  ) INTO has_user_id;
  
  IF has_user_id THEN
    RAISE NOTICE 'orders 表包含 user_id 字段';
  ELSE
    RAISE NOTICE 'orders 表不包含 user_id 字段，迁移时将使用 NULL';
  END IF;
END $$;

-- ============================================
-- 阶段 1: 创建新表结构
-- ============================================

-- 1.1 创建 repair_orders 表（报修工单表）
CREATE TABLE IF NOT EXISTS repair_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- 服务类型：维修服务、清洁服务、工程改造
  service_type TEXT NOT NULL DEFAULT '维修服务',
  CHECK (service_type IN ('维修服务', '清洁服务', '工程改造')),
  
  -- 工单状态
  status TEXT NOT NULL DEFAULT 'pending',
  CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  
  -- 工单内容
  description TEXT,
  audio_url TEXT, -- 语音报修URL
  device_id TEXT, -- 设备ID（可选）
  urgency TEXT, -- 紧急程度：low, medium, high
  
  -- 分配信息
  assigned_to TEXT, -- 分配的工人ID
  worker_id TEXT, -- 兼容字段（已废弃，保留用于兼容）
  
  -- 金额和确认
  amount DECIMAL(10, 2) DEFAULT 0,
  customer_confirmed BOOLEAN DEFAULT false,
  
  -- 备注
  notes TEXT,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 外键约束
  CONSTRAINT fk_repair_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 创建 repair_orders 索引
CREATE INDEX IF NOT EXISTS idx_repair_orders_restaurant_id ON repair_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_repair_orders_status ON repair_orders(status);
CREATE INDEX IF NOT EXISTS idx_repair_orders_service_type ON repair_orders(service_type);
CREATE INDEX IF NOT EXISTS idx_repair_orders_assigned_to ON repair_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_repair_orders_created_at ON repair_orders(created_at DESC);

-- 创建 repair_orders 更新时间触发器
CREATE OR REPLACE FUNCTION update_repair_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_repair_orders_updated_at ON repair_orders;
CREATE TRIGGER trigger_repair_orders_updated_at
  BEFORE UPDATE ON repair_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_repair_orders_updated_at();

-- 1.2 创建 delivery_orders 表（燃料配送订单表）
CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- 产品类型
  product_type TEXT, -- 产品类型（如：lpg, clean, alcohol等）
  service_type TEXT NOT NULL DEFAULT '燃料配送',
  
  -- 订单状态
  status TEXT NOT NULL DEFAULT 'pending',
  CHECK (status IN ('pending', 'processing', 'delivering', 'completed', 'cancelled')),
  
  -- 配送信息
  assigned_to TEXT, -- 分配的配送员ID
  worker_id TEXT, -- 兼容字段（已废弃，保留用于兼容）
  tracking_code TEXT, -- 溯源码
  proof_image TEXT, -- 配送凭证图片
  
  -- 金额和确认
  amount DECIMAL(10, 2) DEFAULT 0,
  customer_confirmed BOOLEAN DEFAULT false,
  
  -- 备注
  notes TEXT,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 外键约束
  CONSTRAINT fk_delivery_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- 创建 delivery_orders 索引
CREATE INDEX IF NOT EXISTS idx_delivery_orders_restaurant_id ON delivery_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_product_type ON delivery_orders(product_type);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_assigned_to ON delivery_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created_at ON delivery_orders(created_at DESC);

-- 创建 delivery_orders 更新时间触发器
CREATE OR REPLACE FUNCTION update_delivery_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delivery_orders_updated_at ON delivery_orders;
CREATE TRIGGER trigger_delivery_orders_updated_at
  BEFORE UPDATE ON delivery_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_orders_updated_at();

-- ============================================
-- 阶段 2: 启用 RLS 并创建策略
-- ============================================

-- 启用 RLS
ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;

-- repair_orders RLS 策略
-- 策略1：用户可以查看自己餐厅的报修工单
DROP POLICY IF EXISTS "Users can view repair orders of their restaurant" ON repair_orders;
CREATE POLICY "Users can view repair orders of their restaurant"
  ON repair_orders FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

-- 策略2：用户可以创建自己餐厅的报修工单
DROP POLICY IF EXISTS "Users can create repair orders for their restaurant" ON repair_orders;
CREATE POLICY "Users can create repair orders for their restaurant"
  ON repair_orders FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

-- 策略3：管理员和分配的工人可以更新报修工单
DROP POLICY IF EXISTS "Admins and assigned workers can update repair orders" ON repair_orders;
CREATE POLICY "Admins and assigned workers can update repair orders"
  ON repair_orders FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
    OR assigned_to = auth.uid()::TEXT
  );

-- delivery_orders RLS 策略
-- 策略1：用户可以查看自己餐厅的配送订单
DROP POLICY IF EXISTS "Users can view delivery orders of their restaurant" ON delivery_orders;
CREATE POLICY "Users can view delivery orders of their restaurant"
  ON delivery_orders FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

-- 策略2：用户可以创建自己餐厅的配送订单
DROP POLICY IF EXISTS "Users can create delivery orders for their restaurant" ON delivery_orders;
CREATE POLICY "Users can create delivery orders for their restaurant"
  ON delivery_orders FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

-- 策略3：管理员和分配的配送员可以更新配送订单
DROP POLICY IF EXISTS "Admins and assigned delivery workers can update delivery orders" ON delivery_orders;
CREATE POLICY "Admins and assigned delivery workers can update delivery orders"
  ON delivery_orders FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
    OR assigned_to = auth.uid()::TEXT
  );

-- ============================================
-- 阶段 3: 数据迁移（安全版本）
-- ============================================

-- 注意：执行前请先备份数据库！

-- 3.1 迁移报修工单数据（处理 user_id 字段可能不存在的情况）
DO $$
DECLARE
  has_user_id BOOLEAN;
BEGIN
  -- 检查 orders 表是否有 user_id 字段
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'orders' 
    AND column_name = 'user_id'
  ) INTO has_user_id;
  
  IF has_user_id THEN
    -- orders 表有 user_id 字段，正常迁移
    EXECUTE '
    INSERT INTO repair_orders (
      id, restaurant_id, user_id, service_type, status, description,
      audio_url, device_id, urgency, assigned_to, worker_id,
      amount, customer_confirmed, notes, created_at, updated_at
    )
    SELECT 
      id, restaurant_id, NULLIF(user_id, '''')::UUID, service_type, status, description,
      audio_url, device_id, urgency, assigned_to, worker_id,
      COALESCE(amount, 0), COALESCE(customer_confirmed, false), notes,
      created_at, updated_at
    FROM orders
    WHERE service_type IN (''维修服务'', ''清洁服务'', ''工程改造'')
      AND id NOT IN (SELECT id FROM repair_orders)
    ON CONFLICT (id) DO NOTHING';
    
    RAISE NOTICE '报修工单数据迁移完成（包含 user_id）';
  ELSE
    -- orders 表没有 user_id 字段，迁移时使用 NULL
    EXECUTE '
    INSERT INTO repair_orders (
      id, restaurant_id, user_id, service_type, status, description,
      audio_url, device_id, urgency, assigned_to, worker_id,
      amount, customer_confirmed, notes, created_at, updated_at
    )
    SELECT 
      id, restaurant_id, NULL::UUID, service_type, status, description,
      audio_url, device_id, urgency, assigned_to, worker_id,
      COALESCE(amount, 0), COALESCE(customer_confirmed, false), notes,
      created_at, updated_at
    FROM orders
    WHERE service_type IN (''维修服务'', ''清洁服务'', ''工程改造'')
      AND id NOT IN (SELECT id FROM repair_orders)
    ON CONFLICT (id) DO NOTHING';
    
    RAISE NOTICE '报修工单数据迁移完成（user_id 使用 NULL）';
  END IF;
END $$;

-- 3.2 迁移燃料配送订单数据（处理 user_id 字段可能不存在的情况）
DO $$
DECLARE
  has_user_id BOOLEAN;
BEGIN
  -- 检查 orders 表是否有 user_id 字段
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'orders' 
    AND column_name = 'user_id'
  ) INTO has_user_id;
  
  IF has_user_id THEN
    -- orders 表有 user_id 字段，正常迁移
    EXECUTE '
    INSERT INTO delivery_orders (
      id, restaurant_id, user_id, product_type, service_type, status,
      assigned_to, worker_id, tracking_code, proof_image,
      amount, customer_confirmed, notes, created_at, updated_at
    )
    SELECT 
      id, restaurant_id, NULLIF(user_id, '''')::UUID, product_type, service_type, status,
      assigned_to, worker_id, tracking_code, proof_image,
      COALESCE(amount, 0), COALESCE(customer_confirmed, false), notes,
      created_at, updated_at
    FROM orders
    WHERE service_type = ''燃料配送''
      AND id NOT IN (SELECT id FROM delivery_orders)
    ON CONFLICT (id) DO NOTHING';
    
    RAISE NOTICE '配送订单数据迁移完成（包含 user_id）';
  ELSE
    -- orders 表没有 user_id 字段，迁移时使用 NULL
    EXECUTE '
    INSERT INTO delivery_orders (
      id, restaurant_id, user_id, product_type, service_type, status,
      assigned_to, worker_id, tracking_code, proof_image,
      amount, customer_confirmed, notes, created_at, updated_at
    )
    SELECT 
      id, restaurant_id, NULL::UUID, product_type, service_type, status,
      assigned_to, worker_id, tracking_code, proof_image,
      COALESCE(amount, 0), COALESCE(customer_confirmed, false), notes,
      created_at, updated_at
    FROM orders
    WHERE service_type = ''燃料配送''
      AND id NOT IN (SELECT id FROM delivery_orders)
    ON CONFLICT (id) DO NOTHING';
    
    RAISE NOTICE '配送订单数据迁移完成（user_id 使用 NULL）';
  END IF;
END $$;

-- ============================================
-- 阶段 4: 数据验证
-- ============================================

-- 4.1 验证报修工单迁移
DO $$
DECLARE
  repair_count INTEGER;
  delivery_count INTEGER;
  repair_original INTEGER;
  delivery_original INTEGER;
BEGIN
  -- 统计迁移后的数据
  SELECT COUNT(*) INTO repair_count FROM repair_orders;
  SELECT COUNT(*) INTO delivery_count FROM delivery_orders;
  
  -- 统计原始数据
  SELECT COUNT(*) INTO repair_original FROM orders 
    WHERE service_type IN ('维修服务', '清洁服务', '工程改造');
  SELECT COUNT(*) INTO delivery_original FROM orders 
    WHERE service_type = '燃料配送';
  
  -- 输出统计信息
  RAISE NOTICE '========================================';
  RAISE NOTICE '数据迁移验证结果';
  RAISE NOTICE '========================================';
  RAISE NOTICE '报修工单 - 原始数量: %', repair_original;
  RAISE NOTICE '报修工单 - 迁移数量: %', repair_count;
  RAISE NOTICE '配送订单 - 原始数量: %', delivery_original;
  RAISE NOTICE '配送订单 - 迁移数量: %', delivery_count;
  RAISE NOTICE '========================================';
  
  -- 验证数据完整性
  IF repair_count != repair_original THEN
    RAISE WARNING '报修工单数据迁移不完整！原始: %, 迁移: %', repair_original, repair_count;
  END IF;
  
  IF delivery_count != delivery_original THEN
    RAISE WARNING '配送订单数据迁移不完整！原始: %, 迁移: %', delivery_original, delivery_count;
  END IF;
  
  IF repair_count = repair_original AND delivery_count = delivery_original THEN
    RAISE NOTICE '✅ 数据迁移成功！所有数据已正确迁移。';
  END IF;
END $$;

-- 4.2 验证数据详情
SELECT 
  'repair_orders' as table_name,
  COUNT(*) as total_count,
  COUNT(DISTINCT restaurant_id) as restaurant_count,
  COUNT(DISTINCT service_type) as service_type_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
FROM repair_orders;

SELECT 
  'delivery_orders' as table_name,
  COUNT(*) as total_count,
  COUNT(DISTINCT restaurant_id) as restaurant_count,
  COUNT(DISTINCT product_type) as product_type_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
  COUNT(*) FILTER (WHERE status = 'delivering') as delivering_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
FROM delivery_orders;

-- ============================================
-- 完成
-- ============================================

-- 迁移完成后：
-- 1. 验证所有 API 功能正常
-- 2. 监控系统运行情况
-- 3. 30 天后确认无问题，可以删除原 orders 表（如果不再需要）

-- 注意：不要立即删除 orders 表！
-- 建议保留 30 天作为备份，确认无问题后再删除
