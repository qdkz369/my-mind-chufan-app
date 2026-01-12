-- ============================================
-- 创建 equipment_catalog 表（产品库）
-- 供应商上传产品信息，审核通过后才能被客户看到
-- ============================================

-- 1. 创建 equipment_catalog 表
CREATE TABLE IF NOT EXISTS equipment_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 供应商信息
  provider_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- 产品基本信息
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  description TEXT,
  specifications JSONB,
  
  -- 产品图片
  images TEXT[] DEFAULT '{}',
  
  -- 分类信息
  category_id UUID REFERENCES equipment_categories(id) ON DELETE SET NULL,
  
  -- 价格信息
  monthly_rental_price DECIMAL(10, 2) NOT NULL,
  daily_rental_price DECIMAL(10, 2),
  deposit_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- 租期限制
  min_rental_period INTEGER DEFAULT 1,
  max_rental_period INTEGER,
  
  -- 服务信息
  maintenance_included BOOLEAN DEFAULT true,
  delivery_included BOOLEAN DEFAULT false,
  
  -- 审核状态
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID, -- 审核人ID（可以关联 users 表）
  rejection_reason TEXT, -- 如果审核不通过，记录原因
  
  -- 状态
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'inactive')),
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 其他信息
  notes TEXT
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_provider ON equipment_catalog(provider_id);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_category ON equipment_catalog(category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_status ON equipment_catalog(status);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_is_approved ON equipment_catalog(is_approved);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_created_at ON equipment_catalog(created_at DESC);

-- 3. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_equipment_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_equipment_catalog_updated_at ON equipment_catalog;
CREATE TRIGGER trigger_update_equipment_catalog_updated_at
  BEFORE UPDATE ON equipment_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_catalog_updated_at();

-- 4. 启用行级安全（RLS）
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略
-- 服务角色完全访问
DROP POLICY IF EXISTS "Service role full access to equipment catalog" ON equipment_catalog;
CREATE POLICY "Service role full access to equipment catalog"
  ON equipment_catalog
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 认证用户查看已审核通过的产品
DROP POLICY IF EXISTS "Authenticated users can view approved equipment" ON equipment_catalog;
CREATE POLICY "Authenticated users can view approved equipment"
  ON equipment_catalog
  FOR SELECT
  TO authenticated
  USING (is_approved = true AND status = 'active');

-- 认证用户创建产品（供应商上传）
DROP POLICY IF EXISTS "Authenticated users can create equipment catalog" ON equipment_catalog;
CREATE POLICY "Authenticated users can create equipment catalog"
  ON equipment_catalog
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 认证用户更新自己的产品
DROP POLICY IF EXISTS "Authenticated users can update their equipment" ON equipment_catalog;
CREATE POLICY "Authenticated users can update their equipment"
  ON equipment_catalog
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. 添加表注释
COMMENT ON TABLE equipment_catalog IS '产品库：供应商上传的产品信息，审核通过后才能被客户看到';
COMMENT ON COLUMN equipment_catalog.provider_id IS '供应商ID，关联 companies 表';
COMMENT ON COLUMN equipment_catalog.is_approved IS '是否审核通过';
COMMENT ON COLUMN equipment_catalog.approved_at IS '审核通过时间';
COMMENT ON COLUMN equipment_catalog.approved_by IS '审核人ID';
COMMENT ON COLUMN equipment_catalog.rejection_reason IS '审核不通过的原因';
COMMENT ON COLUMN equipment_catalog.status IS '状态：pending(待审核)、approved(已审核)、rejected(已拒绝)、active(激活)、inactive(停用)';

-- 7. 验证表是否创建成功
SELECT 
  'equipment_catalog 表创建成功！' AS 消息,
  COUNT(*) AS 字段数量
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'equipment_catalog';

-- 8. 验证 RLS 策略
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE
    WHEN roles = '{service_role}' THEN '✅ 服务角色（API使用）'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户（前端使用）'
    ELSE roles::text
  END AS 角色说明
FROM pg_policies
WHERE tablename = 'equipment_catalog'
ORDER BY policyname;


