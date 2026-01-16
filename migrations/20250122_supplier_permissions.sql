-- ============================================
-- 供应商权限管理 - 多租户数据隔离
-- 创建时间：2025-01-22
-- ============================================

-- ============================================
-- 1. 创建供应商功能权限表
-- 用于控制每个供应商可以访问的功能模块
-- ============================================

CREATE TABLE IF NOT EXISTS company_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- 功能模块标识（对应侧边栏菜单的 key）
  -- 可选值：dashboard, restaurants, orders, repairs, equipmentRental, 
  --        rentals, productApproval, supplierManagement, devices, 
  --        workers, fuelPricing, agreements, api, analytics, settings
  permission_key VARCHAR(50) NOT NULL,
  
  -- 是否启用
  enabled BOOLEAN DEFAULT true,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束：一个公司的一个功能只能有一条记录
  UNIQUE(company_id, permission_key)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_company_permissions_company ON company_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_permissions_key ON company_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_company_permissions_enabled ON company_permissions(company_id, enabled) WHERE enabled = true;

-- ============================================
-- 2. 创建供应商燃料品种关联表
-- 用于控制每个供应商可以供应的燃料品种
-- ============================================

CREATE TABLE IF NOT EXISTS company_fuel_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- 燃料品种标识（需要与燃料价格表中的 fuel_type 字段对应）
  -- 例如：diesel（柴油）、gasoline（汽油）、lpg（液化气）等
  fuel_type VARCHAR(50) NOT NULL,
  
  -- 是否启用
  enabled BOOLEAN DEFAULT true,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束：一个公司的一个燃料品种只能有一条记录
  UNIQUE(company_id, fuel_type)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_company_fuel_types_company ON company_fuel_types(company_id);
CREATE INDEX IF NOT EXISTS idx_company_fuel_types_type ON company_fuel_types(fuel_type);
CREATE INDEX IF NOT EXISTS idx_company_fuel_types_enabled ON company_fuel_types(company_id, enabled) WHERE enabled = true;

-- ============================================
-- 3. 创建更新时间触发器
-- ============================================

-- company_permissions 表触发器
CREATE OR REPLACE FUNCTION update_company_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_company_permissions_updated_at ON company_permissions;
CREATE TRIGGER trigger_update_company_permissions_updated_at
  BEFORE UPDATE ON company_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_company_permissions_updated_at();

-- company_fuel_types 表触发器
CREATE OR REPLACE FUNCTION update_company_fuel_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_company_fuel_types_updated_at ON company_fuel_types;
CREATE TRIGGER trigger_update_company_fuel_types_updated_at
  BEFORE UPDATE ON company_fuel_types
  FOR EACH ROW
  EXECUTE FUNCTION update_company_fuel_types_updated_at();

-- ============================================
-- 4. 启用 RLS（行级安全策略）
-- ============================================

ALTER TABLE company_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_fuel_types ENABLE ROW LEVEL SECURITY;

-- RLS 策略：服务角色完全访问
CREATE POLICY "Service role full access to company_permissions"
  ON company_permissions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to company_fuel_types"
  ON company_fuel_types FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- RLS 策略：用户只能查看自己公司的权限
CREATE POLICY "Users can view their company permissions"
  ON company_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.user_id = auth.uid()
      AND user_companies.company_id = company_permissions.company_id
    )
  );

CREATE POLICY "Users can view their company fuel types"
  ON company_fuel_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.user_id = auth.uid()
      AND user_companies.company_id = company_fuel_types.company_id
    )
  );

-- ============================================
-- 5. 添加注释
-- ============================================

COMMENT ON TABLE company_permissions IS '供应商功能权限表，控制每个供应商可以访问的功能模块';
COMMENT ON TABLE company_fuel_types IS '供应商燃料品种关联表，控制每个供应商可以供应的燃料品种';
COMMENT ON COLUMN company_permissions.permission_key IS '功能模块标识，对应侧边栏菜单的 key';
COMMENT ON COLUMN company_fuel_types.fuel_type IS '燃料品种标识，需要与燃料价格表中的 fuel_type 字段对应';

-- ============================================
-- 6. 验证表是否创建成功
-- ============================================

SELECT 
  'company_permissions' AS 表名,
  COUNT(*) AS 记录数
FROM company_permissions
UNION ALL
SELECT 
  'company_fuel_types' AS 表名,
  COUNT(*) AS 记录数
FROM company_fuel_types;
