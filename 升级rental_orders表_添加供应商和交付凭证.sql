-- ============================================
-- 升级 rental_orders 表
-- 添加供应商关联、财务模式、交付凭证等字段
-- ============================================

-- 1. 检查 companies 表是否存在，如果不存在则创建
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(100),
  address TEXT,
  business_license VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 为 rental_orders 表添加新字段
-- 供应商关联
ALTER TABLE rental_orders 
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- 财务模式（直租、第三方融资）
ALTER TABLE rental_orders 
  ADD COLUMN IF NOT EXISTS funding_type VARCHAR(20) DEFAULT 'direct' CHECK (funding_type IN ('direct', 'third_party'));

-- 交付凭证
ALTER TABLE rental_orders 
  ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT false;

ALTER TABLE rental_orders 
  ADD COLUMN IF NOT EXISTS setup_photo TEXT[] DEFAULT '{}';

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_rental_orders_provider ON rental_orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_funding_type ON rental_orders(funding_type);
CREATE INDEX IF NOT EXISTS idx_rental_orders_is_signed ON rental_orders(is_signed);

-- 4. 添加注释
COMMENT ON COLUMN rental_orders.provider_id IS '供应商ID，关联 companies 表';
COMMENT ON COLUMN rental_orders.funding_type IS '财务模式：direct(直租)、third_party(第三方融资)';
COMMENT ON COLUMN rental_orders.is_signed IS '客户是否签收';
COMMENT ON COLUMN rental_orders.setup_photo IS '安装完成照片URL数组';

-- 5. 验证字段是否添加成功
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'rental_orders'
  AND column_name IN ('provider_id', 'funding_type', 'is_signed', 'setup_photo')
ORDER BY column_name;


