-- ============================================
-- 检查并修复 companies 表的 RLS 策略
-- 确保管理员可以创建和更新公司
-- ============================================

-- 1. 检查当前 RLS 状态
SELECT 
  tablename AS 表名,
  rowsecurity AS RLS已启用
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'companies';

-- 2. 查看现有的策略
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  roles AS 角色
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

-- 3. 删除所有现有策略（避免冲突）
DROP POLICY IF EXISTS "Service role full access to companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can delete companies" ON companies;

-- 4. 确保 RLS 已启用
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 5. 创建新的 RLS 策略

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

-- 6. 验证策略创建结果
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE 
    WHEN roles = '{service_role}' THEN '✅ 服务角色（API使用）'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户（前端使用）'
    ELSE roles::text
  END AS 角色说明
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

-- 7. 验证表结构
SELECT 
  column_name AS 字段名,
  data_type AS 数据类型,
  is_nullable AS 可为空,
  column_default AS 默认值
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies'
ORDER BY ordinal_position;

