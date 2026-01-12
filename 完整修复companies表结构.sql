-- ============================================
-- 完整修复 companies 表结构
-- 确保所有必需字段都存在
-- ============================================

-- 1. 如果表不存在，创建完整的表
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

-- 2. 如果表已存在，添加缺失的字段
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(100);

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100);

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS business_license VARCHAR(100);

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. 添加 status 字段的 CHECK 约束（如果不存在）
DO $$
BEGIN
  -- 检查约束是否存在
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'companies_status_check'
  ) THEN
    ALTER TABLE companies 
      ADD CONSTRAINT companies_status_check 
      CHECK (status IN ('active', 'inactive', 'suspended'));
  END IF;
END $$;

-- 4. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON companies;
CREATE TRIGGER trigger_update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- 5. 验证表结构
SELECT 
  column_name AS 字段名,
  data_type AS 数据类型,
  character_maximum_length AS 最大长度,
  is_nullable AS 可为空,
  column_default AS 默认值
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies'
ORDER BY ordinal_position;

-- 6. 验证结果
SELECT 
  'companies 表结构修复完成！' AS 消息,
  COUNT(*) AS 字段数量
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies';


