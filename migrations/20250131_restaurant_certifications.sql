-- ============================================
-- 创建 restaurant_certifications 表（企业资质认证）
-- 创建日期: 2026-01-31
-- 说明: 存储企业法人信息、企业信息及证件上传，需保护敏感数据
-- ============================================

CREATE TABLE IF NOT EXISTS restaurant_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  
  -- 法人信息（敏感，仅本人可查看/编辑）
  legal_rep_name VARCHAR(100),
  legal_rep_id_number VARCHAR(50),
  legal_rep_phone VARCHAR(30),
  
  -- 企业信息
  company_name VARCHAR(200),
  unified_social_credit_code VARCHAR(50),
  registered_address TEXT,
  business_scope TEXT,
  
  -- 证件上传（URL 或存储路径）
  business_license_url TEXT,
  food_license_url TEXT,
  
  -- 状态
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  rejected_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_certifications_restaurant_id ON restaurant_certifications(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_certifications_status ON restaurant_certifications(status);

COMMENT ON TABLE restaurant_certifications IS '餐厅企业资质认证表（含法人、企业信息及证件）';
COMMENT ON COLUMN restaurant_certifications.legal_rep_id_number IS '法人身份证号（敏感数据，仅 restaurant 本人可访问）';
COMMENT ON COLUMN restaurant_certifications.unified_social_credit_code IS '统一社会信用代码';

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_restaurant_certifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_restaurant_certifications_updated_at ON restaurant_certifications;
CREATE TRIGGER trigger_update_restaurant_certifications_updated_at
BEFORE UPDATE ON restaurant_certifications
FOR EACH ROW
EXECUTE FUNCTION update_restaurant_certifications_updated_at();

-- RLS：仅服务角色和本餐厅可访问，保护法人及企业信息
ALTER TABLE restaurant_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to restaurant_certifications" ON restaurant_certifications;
CREATE POLICY "Service role full access to restaurant_certifications"
ON restaurant_certifications FOR ALL TO service_role
USING (true) WITH CHECK (true);
