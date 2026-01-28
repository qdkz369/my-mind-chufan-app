-- ============================================
-- 租赁与资产相关的最小表结构 - 阶段 E
-- 创建日期: 2025-01-20
-- 说明: 创建设备所有权、租赁合同相关表结构
-- 设计原则:
--   - 不影响任何现有表
--   - 不引入外键级联删除
--   - 不涉及金额计算逻辑
--   - 字段语义清晰，偏金融/法务中性
-- ============================================

-- ============================================
-- 1️⃣ 创建 device_ownerships 表（设备所有权/出资结构）
-- ============================================

-- 说明：
-- - 记录设备的所有权归属和出资结构
-- - 支持多主体共同拥有（通过多条记录实现）
-- - owner_type: platform（平台）、manufacturer（厂家）、leasing_company（租赁公司）、finance_partner（金融机构）
CREATE TABLE IF NOT EXISTS device_ownerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL,
  owner_type VARCHAR(50) NOT NULL,
  CHECK (owner_type IN ('platform', 'manufacturer', 'leasing_company', 'finance_partner')),
  owner_id UUID NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_device_ownerships_device_id ON device_ownerships(device_id);
CREATE INDEX IF NOT EXISTS idx_device_ownerships_owner_type ON device_ownerships(owner_type);
CREATE INDEX IF NOT EXISTS idx_device_ownerships_owner_id ON device_ownerships(owner_id);
CREATE INDEX IF NOT EXISTS idx_device_ownerships_start_at ON device_ownerships(start_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_ownerships_end_at ON device_ownerships(end_at DESC);

-- 复合索引：设备ID + 所有权类型（查询某个设备的所有权结构）
CREATE INDEX IF NOT EXISTS idx_device_ownerships_device_owner ON device_ownerships(device_id, owner_type);

-- 复合索引：所有权类型 + 所有权ID（查询某个主体的所有设备）
CREATE INDEX IF NOT EXISTS idx_device_ownerships_owner ON device_ownerships(owner_type, owner_id);

-- ============================================
-- 2️⃣ 创建 rental_contracts 表（租赁合同主表）
-- ============================================

-- 说明：
-- - 记录租赁合同的基本信息
-- - lessor_type: platform（平台）、manufacturer（厂家）、leasing_company（租赁公司）、finance_partner（金融机构）
-- - billing_model: fixed（固定费用）、usage_based（按使用量计费）、hybrid（混合模式）
-- - status: draft（草稿）、active（生效中）、ended（已结束）、breached（违约）
CREATE TABLE IF NOT EXISTS rental_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_no VARCHAR(100) UNIQUE NOT NULL,
  lessee_restaurant_id UUID NOT NULL,
  lessor_type VARCHAR(50) NOT NULL,
  CHECK (lessor_type IN ('platform', 'manufacturer', 'leasing_company', 'finance_partner')),
  lessor_id UUID NOT NULL,
  start_at DATE NOT NULL,
  end_at DATE NOT NULL,
  billing_model VARCHAR(50) NOT NULL,
  CHECK (billing_model IN ('fixed', 'usage_based', 'hybrid')),
  status VARCHAR(50) NOT NULL,
  CHECK (status IN ('draft', 'active', 'ended', 'breached')),
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_rental_contracts_contract_no ON rental_contracts(contract_no);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_lessee_restaurant_id ON rental_contracts(lessee_restaurant_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_lessor_type ON rental_contracts(lessor_type);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_lessor_id ON rental_contracts(lessor_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_start_at ON rental_contracts(start_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_end_at ON rental_contracts(end_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_status ON rental_contracts(status);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_billing_model ON rental_contracts(billing_model);

-- 复合索引：承租人餐厅ID + 状态（查询某个餐厅的生效合同）
CREATE INDEX IF NOT EXISTS idx_rental_contracts_lessee_status ON rental_contracts(lessee_restaurant_id, status);

-- 复合索引：出租人类型 + 出租人ID + 状态（查询某个主体的合同）
CREATE INDEX IF NOT EXISTS idx_rental_contracts_lessor_status ON rental_contracts(lessor_type, lessor_id, status);

-- ============================================
-- 3️⃣ 创建 rental_contract_devices 表（合同-设备关系表）
-- ============================================

-- 说明：
-- - 记录租赁合同中包含的设备及其计费方式
-- - 一个合同可以包含多个设备
-- - 一个设备在同一时间段只能属于一个生效的合同（业务逻辑约束，不在数据库层面强制）
-- - agreed_daily_fee: 约定的日租金（固定费用模式）
-- - agreed_monthly_fee: 约定的月租金（固定费用模式）
-- - agreed_usage_metric: 约定的使用量计量单位（按使用量计费模式）：hours（小时）、orders（订单数）、energy（能耗）
CREATE TABLE IF NOT EXISTS rental_contract_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_contract_id UUID NOT NULL,
  device_id UUID NOT NULL,
  agreed_daily_fee DECIMAL(10, 2),
  agreed_monthly_fee DECIMAL(10, 2),
  agreed_usage_metric VARCHAR(50),
  CHECK (agreed_usage_metric IS NULL OR agreed_usage_metric IN ('hours', 'orders', 'energy')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_rental_contract_devices_contract_id ON rental_contract_devices(rental_contract_id);
CREATE INDEX IF NOT EXISTS idx_rental_contract_devices_device_id ON rental_contract_devices(device_id);

-- 复合索引：合同ID + 设备ID（确保一个设备在一个合同中只出现一次）
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_contract_devices_contract_device ON rental_contract_devices(rental_contract_id, device_id);

-- ============================================
-- 4️⃣ RLS 策略（宽松策略，不强制拦截）
-- ============================================

-- 启用 RLS
ALTER TABLE device_ownerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contract_devices ENABLE ROW LEVEL SECURITY;

-- device_ownerships RLS 策略 (基于公司隔离)
DROP POLICY IF EXISTS "Allow all select on device_ownerships" ON device_ownerships;
CREATE POLICY "device_ownerships_company_isolation_select"
  ON device_ownerships FOR SELECT
  TO authenticated
  USING (
    -- 通过设备查询关联公司
    device_id IN (
      SELECT d.device_id 
      FROM devices d 
      JOIN restaurants r ON d.restaurant_id = r.id 
      WHERE r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow all insert on device_ownerships" ON device_ownerships;
CREATE POLICY "device_ownerships_company_isolation_insert"
  ON device_ownerships FOR INSERT
  TO authenticated
  WITH CHECK (
    device_id IN (
      SELECT d.device_id 
      FROM devices d 
      JOIN restaurants r ON d.restaurant_id = r.id 
      WHERE r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow all update on device_ownerships" ON device_ownerships;
CREATE POLICY "device_ownerships_company_isolation_update"
  ON device_ownerships FOR UPDATE
  TO authenticated
  USING (
    device_id IN (
      SELECT d.device_id 
      FROM devices d 
      JOIN restaurants r ON d.restaurant_id = r.id 
      WHERE r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    device_id IN (
      SELECT d.device_id 
      FROM devices d 
      JOIN restaurants r ON d.restaurant_id = r.id 
      WHERE r.user_id = auth.uid()
    )
  );

-- rental_contracts RLS 策略 (基于餐厅隔离)
DROP POLICY IF EXISTS "Allow all select on rental_contracts" ON rental_contracts;
CREATE POLICY "rental_contracts_company_isolation_select"
  ON rental_contracts FOR SELECT
  TO authenticated
  USING (
    lessee_restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow all insert on rental_contracts" ON rental_contracts;
CREATE POLICY "rental_contracts_company_isolation_insert"
  ON rental_contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    lessee_restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow all update on rental_contracts" ON rental_contracts;
CREATE POLICY "rental_contracts_company_isolation_update"
  ON rental_contracts FOR UPDATE
  TO authenticated
  USING (
    lessee_restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    lessee_restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

-- rental_contract_devices RLS 策略 (基于合同隔离)
DROP POLICY IF EXISTS "Allow all select on rental_contract_devices" ON rental_contract_devices;
CREATE POLICY "rental_contract_devices_company_isolation_select"
  ON rental_contract_devices FOR SELECT
  TO authenticated
  USING (
    rental_contract_id IN (
      SELECT id FROM rental_contracts 
      WHERE lessee_restaurant_id IN (
        SELECT id FROM restaurants WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Allow all insert on rental_contract_devices" ON rental_contract_devices;
CREATE POLICY "rental_contract_devices_company_isolation_insert"
  ON rental_contract_devices FOR INSERT
  TO authenticated
  WITH CHECK (
    rental_contract_id IN (
      SELECT id FROM rental_contracts 
      WHERE lessee_restaurant_id IN (
        SELECT id FROM restaurants WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Allow all update on rental_contract_devices" ON rental_contract_devices;
CREATE POLICY "rental_contract_devices_company_isolation_update"
  ON rental_contract_devices FOR UPDATE
  TO authenticated
  USING (
    rental_contract_id IN (
      SELECT id FROM rental_contracts 
      WHERE lessee_restaurant_id IN (
        SELECT id FROM restaurants WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    rental_contract_id IN (
      SELECT id FROM rental_contracts 
      WHERE lessee_restaurant_id IN (
        SELECT id FROM restaurants WHERE user_id = auth.uid()
      )
    )
  );

-- Service role 完全访问策略
CREATE POLICY "Service role full access to device_ownerships"
ON device_ownerships FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to rental_contracts"
ON rental_contracts FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to rental_contract_devices"
ON rental_contract_devices FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================
-- 6️⃣ 验证表创建
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_ownerships') THEN
    RAISE NOTICE '✅ device_ownerships 表创建成功';
  ELSE
    RAISE WARNING '❌ device_ownerships 表创建失败';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rental_contracts') THEN
    RAISE NOTICE '✅ rental_contracts 表创建成功';
  ELSE
    RAISE WARNING '❌ rental_contracts 表创建失败';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rental_contract_devices') THEN
    RAISE NOTICE '✅ rental_contract_devices 表创建成功';
  ELSE
    RAISE WARNING '❌ rental_contract_devices 表创建失败';
  END IF;
END $$;
