-- ============================================
-- 创建 device_rentals 和 fuel_prices 表
-- 执行日期：2025-01-22
-- 说明：创建这两个表，并包含 company_id 字段以支持供应商数据隔离
-- ============================================

-- ============================================
-- 1. 创建 device_rentals 表（设备租赁关系表）
-- ============================================

CREATE TABLE IF NOT EXISTS device_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 供应商公司ID（支持数据隔离）
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- 设备信息
  device_id TEXT NOT NULL,
  
  -- 餐厅信息
  restaurant_id UUID NOT NULL,
  
  -- 租赁时间
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ, -- 可为空，表示租赁尚未结束
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'active',
  CHECK (status IN ('active', 'ended')),
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加外键约束（如果相关表存在）
DO $$
BEGIN
  -- 检查 devices 表是否存在，如果存在则添加外键
  IF EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'devices'
  ) THEN
    -- 检查是否已存在外键约束
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
      AND tc.table_name = 'device_rentals'
      AND tc.constraint_name = 'fk_device_rentals_device'
    ) THEN
      ALTER TABLE device_rentals
      ADD CONSTRAINT fk_device_rentals_device
      FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE;
      RAISE NOTICE '✅ 已添加 device_rentals.device_id 外键约束';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  devices 表不存在，跳过 device_id 外键约束';
  END IF;
  
  -- 检查 restaurants 表是否存在，如果存在则添加外键
  IF EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'restaurants'
  ) THEN
    -- 检查是否已存在外键约束
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
      AND tc.table_name = 'device_rentals'
      AND tc.constraint_name = 'fk_device_rentals_restaurant'
    ) THEN
      ALTER TABLE device_rentals
      ADD CONSTRAINT fk_device_rentals_restaurant
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ 已添加 device_rentals.restaurant_id 外键约束';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  restaurants 表不存在，跳过 restaurant_id 外键约束';
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_device_rentals_company_id ON device_rentals(company_id);
CREATE INDEX IF NOT EXISTS idx_device_rentals_device_id ON device_rentals(device_id);
CREATE INDEX IF NOT EXISTS idx_device_rentals_restaurant_id ON device_rentals(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_device_rentals_status ON device_rentals(status);
CREATE INDEX IF NOT EXISTS idx_device_rentals_start_at ON device_rentals(start_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_rentals_end_at ON device_rentals(end_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_rentals_device_status ON device_rentals(device_id, status);
CREATE INDEX IF NOT EXISTS idx_device_rentals_restaurant_status ON device_rentals(restaurant_id, status);

-- 创建自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_device_rentals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_device_rentals_updated_at_trigger
BEFORE UPDATE ON device_rentals
FOR EACH ROW
EXECUTE FUNCTION update_device_rentals_updated_at();

-- 启用 RLS
ALTER TABLE device_rentals ENABLE ROW LEVEL SECURITY;

-- RLS 策略：服务角色完全访问
CREATE POLICY "Service role full access to device_rentals"
  ON device_rentals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- RLS 策略：认证用户可以查看自己公司的数据
CREATE POLICY "Authenticated users can view their company device_rentals"
  ON device_rentals FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_id = auth.uid() AND company_id = device_rentals.company_id
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================
-- 2. 创建 fuel_prices 表（燃料价格表）
-- ============================================

CREATE TABLE IF NOT EXISTS fuel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 供应商公司ID（支持数据隔离）
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- 燃料类型标识（对应前端 fuelPrices 的 id）
  fuel_type TEXT NOT NULL,
  
  -- 燃料名称
  fuel_name TEXT NOT NULL,
  
  -- 单位信息
  unit TEXT NOT NULL, -- 单位：kg, L 等
  unit_label TEXT NOT NULL, -- 单位标签：公斤、升 等
  
  -- 价格信息
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- 基础价格
  market_price DECIMAL(10, 2), -- 市场价格（从第三方获取）
  
  -- 自动同步设置
  auto_sync BOOLEAN DEFAULT false, -- 是否自动同步市场价格
  
  -- 状态
  is_active BOOLEAN DEFAULT true, -- 是否启用
  
  -- 时间戳
  last_updated TIMESTAMPTZ, -- 最后更新时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 唯一约束：同一公司的同一燃料类型只能有一条记录
  UNIQUE(company_id, fuel_type)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_fuel_prices_company_id ON fuel_prices(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_fuel_type ON fuel_prices(fuel_type);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_is_active ON fuel_prices(is_active);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_auto_sync ON fuel_prices(auto_sync);

-- 创建自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_fuel_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fuel_prices_updated_at_trigger
BEFORE UPDATE ON fuel_prices
FOR EACH ROW
EXECUTE FUNCTION update_fuel_prices_updated_at();

-- 启用 RLS
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;

-- RLS 策略：服务角色完全访问
CREATE POLICY "Service role full access to fuel_prices"
  ON fuel_prices FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- RLS 策略：认证用户可以查看自己公司的数据
CREATE POLICY "Authenticated users can view their company fuel_prices"
  ON fuel_prices FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_id = auth.uid() AND company_id = fuel_prices.company_id
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- RLS 策略：认证用户可以管理自己公司的燃料价格
CREATE POLICY "Authenticated users can manage their company fuel_prices"
  ON fuel_prices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_id = auth.uid() AND company_id = fuel_prices.company_id
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_id = auth.uid() AND company_id = fuel_prices.company_id
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================
-- 3. 验证表创建
-- ============================================

DO $$
DECLARE
    tables_created INTEGER := 0;
BEGIN
    -- 检查 device_rentals 表
    IF EXISTS (
        SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = 'public' AND t.table_name = 'device_rentals'
    ) THEN
        tables_created := tables_created + 1;
        RAISE NOTICE '✅ device_rentals 表创建成功';
    ELSE
        RAISE WARNING '❌ device_rentals 表创建失败';
    END IF;
    
    -- 检查 fuel_prices 表
    IF EXISTS (
        SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = 'public' AND t.table_name = 'fuel_prices'
    ) THEN
        tables_created := tables_created + 1;
        RAISE NOTICE '✅ fuel_prices 表创建成功';
    ELSE
        RAISE WARNING '❌ fuel_prices 表创建失败';
    END IF;
    
    RAISE NOTICE '===========================================================';
    RAISE NOTICE '📊 表创建汇总：成功创建 % 个表', tables_created;
    RAISE NOTICE '===========================================================';
END $$;
