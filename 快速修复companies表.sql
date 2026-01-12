-- ============================================
-- 快速修复 companies 表 - 添加 address 字段
-- ============================================

-- 添加 address 字段（如果不存在）
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS address TEXT;

-- 添加 updated_at 字段（如果不存在）
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 创建更新时间触发器
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

-- 验证字段是否添加成功
SELECT 
  column_name AS 字段名,
  data_type AS 数据类型,
  is_nullable AS 可为空
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies'
  AND column_name IN ('address', 'updated_at')
ORDER BY column_name;


