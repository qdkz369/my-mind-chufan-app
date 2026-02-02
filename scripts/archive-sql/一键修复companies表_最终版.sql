-- ============================================
-- 一键修复 companies 表（最终版）
-- 确保所有字段都存在，修复 RLS 策略
-- ============================================

-- ============================================
-- 第一部分：修复表结构
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

-- ============================================
-- 第二部分：修复 RLS 策略
-- ============================================

-- 5. 删除所有现有策略（避免冲突）
DROP POLICY IF EXISTS "Service role full access to companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can delete companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can view all companies" ON companies;

-- 6. 确保 RLS 已启用
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 7. 创建新的 RLS 策略

-- 策略1：服务角色完全访问（API 路由使用）
CREATE POLICY "Service role full access to companies"
  ON companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 策略2：认证用户查看所有公司（管理后台需要）
CREATE POLICY "Authenticated users can view all companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

-- 策略3：认证用户创建公司（管理后台需要）
CREATE POLICY "Authenticated users can create companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 策略4：认证用户更新公司（管理后台需要）
CREATE POLICY "Authenticated users can update companies"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 策略5：认证用户删除公司（管理后台需要）
CREATE POLICY "Authenticated users can delete companies"
  ON companies
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 第三部分：验证
-- ============================================

-- 8. 验证表结构
SELECT 
  column_name AS 字段名,
  data_type AS 数据类型,
  character_maximum_length AS 最大长度,
  is_nullable AS 可为空
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies'
ORDER BY ordinal_position;

-- 9. 验证 RLS 策略
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE 
    WHEN roles = '{service_role}' THEN '服务角色（API使用）'
    WHEN roles = '{authenticated}' THEN '认证用户（前端使用）'
    ELSE roles::text
  END AS 角色说明
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

-- 10. 完成提示
SELECT 
  '✅ companies 表修复完成！' AS 消息,
  COUNT(*) AS 字段数量
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies';


