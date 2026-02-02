-- ============================================
-- 修复 companies 表结构（简化版）
-- 添加缺失的 address 字段
-- ============================================

-- 1. 添加 address 字段（如果不存在）
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. 添加 updated_at 字段（如果不存在）
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON companies;

-- 5. 创建触发器
CREATE TRIGGER trigger_update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- 6. 验证字段是否添加成功
SELECT 
  column_name AS 字段名,
  data_type AS 数据类型,
  is_nullable AS 可为空,
  column_default AS 默认值
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies'
ORDER BY ordinal_position;


