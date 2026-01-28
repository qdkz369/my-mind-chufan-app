-- ============================================
-- 检查并创建协议管理和租赁合同相关表
-- 创建日期: 2025-01-25
-- 说明: 用于验证和创建协议管理功能所需的数据库表
-- ============================================

-- ============================================
-- 1️⃣ 检查 agreements 表是否存在
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'agreements'
  ) THEN
    RAISE NOTICE '✅ agreements 表已存在';
  ELSE
    RAISE WARNING '❌ agreements 表不存在，开始创建...';
    
    -- 创建 agreements 表
    CREATE TABLE agreements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- 协议基本信息
      title VARCHAR(200) NOT NULL,
      type VARCHAR(50) NOT NULL,
      version VARCHAR(20) NOT NULL DEFAULT '1.0',
      
      -- 协议内容
      content TEXT NOT NULL,
      content_html TEXT,
      
      -- 状态管理
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      is_active BOOLEAN NOT NULL DEFAULT false,
      
      -- 元数据
      effective_date DATE,
      expiry_date DATE,
      description TEXT,
      
      -- 审核信息
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      
      -- 时间戳
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID,
      updated_by UUID
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_agreements_type ON agreements(type);
    CREATE INDEX IF NOT EXISTS idx_agreements_status ON agreements(status);
    CREATE INDEX IF NOT EXISTS idx_agreements_is_active ON agreements(is_active);
    CREATE INDEX IF NOT EXISTS idx_agreements_type_active ON agreements(type, is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_agreements_created_at ON agreements(created_at DESC);

    -- 添加约束：确保同一类型只能有一个active版本（在 DO 块外部创建）

    -- 添加注释
    COMMENT ON TABLE agreements IS '协议管理表，用于存储各类协议内容（服务协议、支付协议等）';
    COMMENT ON COLUMN agreements.type IS '协议类型：service（服务协议）、payment（支付协议）、privacy（隐私协议）、terms（使用条款）';
    COMMENT ON COLUMN agreements.is_active IS '是否为当前生效版本，同一类型只能有一个active版本';
    COMMENT ON COLUMN agreements.content IS '协议正文内容，支持Markdown格式';
    COMMENT ON COLUMN agreements.content_html IS '协议HTML内容，可选，用于富文本显示';

    RAISE NOTICE '✅ agreements 表创建成功';
  END IF;
END $$;

-- 创建更新时间触发器函数（需要在 DO 块外部）
CREATE OR REPLACE FUNCTION update_agreements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器（如果表存在但触发器不存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'agreements'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_agreements_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_agreements_updated_at_trigger
    BEFORE UPDATE ON agreements
    FOR EACH ROW
    EXECUTE FUNCTION update_agreements_updated_at();
    RAISE NOTICE '✅ agreements 表触发器创建成功';
  END IF;
END $$;

-- 创建唯一索引约束（确保同一类型只能有一个active版本）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'agreements'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_agreements_unique_active_type'
  ) THEN
    CREATE UNIQUE INDEX idx_agreements_unique_active_type 
    ON agreements(type) 
    WHERE is_active = true AND status = 'published';
    RAISE NOTICE '✅ agreements 表唯一索引创建成功';
  END IF;
END $$;

-- ============================================
-- 2️⃣ 检查 rental_contracts 表是否存在
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_contracts'
  ) THEN
    RAISE NOTICE '✅ rental_contracts 表已存在';
  ELSE
    RAISE WARNING '❌ rental_contracts 表不存在，开始创建...';
    
    -- 创建 rental_contracts 表
    CREATE TABLE rental_contracts (
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

    -- 复合索引
    CREATE INDEX IF NOT EXISTS idx_rental_contracts_lessee_status ON rental_contracts(lessee_restaurant_id, status);
    CREATE INDEX IF NOT EXISTS idx_rental_contracts_lessor_status ON rental_contracts(lessor_type, lessor_id, status);

    -- 启用 RLS
    ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;

    -- RLS 策略（宽松策略，允许所有认证用户访问）
    DROP POLICY IF EXISTS "Allow all select on rental_contracts" ON rental_contracts;
    CREATE POLICY "Allow all select on rental_contracts"
      ON rental_contracts FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "Allow all insert on rental_contracts" ON rental_contracts;
    CREATE POLICY "Allow all insert on rental_contracts"
      ON rental_contracts FOR INSERT
      WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all update on rental_contracts" ON rental_contracts;
    CREATE POLICY "Allow all update on rental_contracts"
      ON rental_contracts FOR UPDATE
      USING (true)
      WITH CHECK (true);

    RAISE NOTICE '✅ rental_contracts 表创建成功';
  END IF;
END $$;

-- ============================================
-- 3️⃣ 检查 rental_contract_devices 表是否存在（可选，用于关联设备）
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_contract_devices'
  ) THEN
    RAISE NOTICE '✅ rental_contract_devices 表已存在';
  ELSE
    RAISE WARNING '❌ rental_contract_devices 表不存在，开始创建...';
    
    -- 创建 rental_contract_devices 表
    CREATE TABLE rental_contract_devices (
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

    -- 复合索引：确保一个设备在一个合同中只出现一次
    CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_contract_devices_contract_device 
    ON rental_contract_devices(rental_contract_id, device_id);

    -- 启用 RLS
    ALTER TABLE rental_contract_devices ENABLE ROW LEVEL SECURITY;

    -- RLS 策略
    DROP POLICY IF EXISTS "Allow all select on rental_contract_devices" ON rental_contract_devices;
    CREATE POLICY "Allow all select on rental_contract_devices"
      ON rental_contract_devices FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "Allow all insert on rental_contract_devices" ON rental_contract_devices;
    CREATE POLICY "Allow all insert on rental_contract_devices"
      ON rental_contract_devices FOR INSERT
      WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all update on rental_contract_devices" ON rental_contract_devices;
    CREATE POLICY "Allow all update on rental_contract_devices"
      ON rental_contract_devices FOR UPDATE
      USING (true)
      WITH CHECK (true);

    RAISE NOTICE '✅ rental_contract_devices 表创建成功';
  END IF;
END $$;

-- ============================================
-- 4️⃣ 最终验证
-- ============================================

DO $$
DECLARE
  agreements_exists BOOLEAN;
  rental_contracts_exists BOOLEAN;
  rental_contract_devices_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'agreements'
  ) INTO agreements_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'rental_contracts'
  ) INTO rental_contracts_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'rental_contract_devices'
  ) INTO rental_contract_devices_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE '数据库表检查结果：';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'agreements 表: %', CASE WHEN agreements_exists THEN '✅ 存在' ELSE '❌ 不存在' END;
  RAISE NOTICE 'rental_contracts 表: %', CASE WHEN rental_contracts_exists THEN '✅ 存在' ELSE '❌ 不存在' END;
  RAISE NOTICE 'rental_contract_devices 表: %', CASE WHEN rental_contract_devices_exists THEN '✅ 存在' ELSE '❌ 不存在' END;
  RAISE NOTICE '========================================';
END $$;
