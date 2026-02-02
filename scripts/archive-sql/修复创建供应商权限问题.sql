-- ============================================
-- 修复创建供应商权限问题
-- 确保认证用户可以创建公司和 user_companies 记录
-- ============================================

-- ============================================
-- 第一部分：修复 companies 表的 RLS 策略
-- ============================================

-- 1. 删除所有现有策略（避免冲突）
DROP POLICY IF EXISTS "Service role full access to companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can delete companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can view all companies" ON companies;
DROP POLICY IF EXISTS "Anyone can view companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON companies;

-- 2. 确保 RLS 已启用
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 3. 创建新的 RLS 策略

-- 策略1：服务角色完全访问（API 路由使用 Service Role Key）
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
-- 第二部分：修复 user_companies 表的 RLS 策略
-- ============================================

-- 4. 删除所有现有策略（避免冲突）
DROP POLICY IF EXISTS "Service role full access to user_companies" ON user_companies;
DROP POLICY IF EXISTS "Users can view their own company associations" ON user_companies;
DROP POLICY IF EXISTS "Users can create their own company associations" ON user_companies;
DROP POLICY IF EXISTS "Users can update their own company associations" ON user_companies;
DROP POLICY IF EXISTS "Users can delete their own company associations" ON user_companies;
DROP POLICY IF EXISTS "Authenticated users can view all user_companies" ON user_companies;
DROP POLICY IF EXISTS "Authenticated users can create user_companies" ON user_companies;
DROP POLICY IF EXISTS "Authenticated users can update user_companies" ON user_companies;
DROP POLICY IF EXISTS "Authenticated users can delete user_companies" ON user_companies;

-- 5. 确保 RLS 已启用
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- 6. 创建新的 RLS 策略

-- 策略1：服务角色完全访问（API 路由使用 Service Role Key）
CREATE POLICY "Service role full access to user_companies"
  ON user_companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 策略2：认证用户查看所有关联（管理后台需要）
CREATE POLICY "Authenticated users can view all user_companies"
  ON user_companies
  FOR SELECT
  TO authenticated
  USING (true);

-- 策略3：认证用户创建关联（管理后台需要）
CREATE POLICY "Authenticated users can create user_companies"
  ON user_companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 策略4：认证用户更新关联（管理后台需要）
CREATE POLICY "Authenticated users can update user_companies"
  ON user_companies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 策略5：认证用户删除关联（管理后台需要）
CREATE POLICY "Authenticated users can delete user_companies"
  ON user_companies
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 第三部分：验证
-- ============================================

-- 7. 验证 companies 表的 RLS 策略
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

-- 8. 验证 user_companies 表的 RLS 策略
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE 
    WHEN roles = '{service_role}' THEN '服务角色（API使用）'
    WHEN roles = '{authenticated}' THEN '认证用户（前端使用）'
    ELSE roles::text
  END AS 角色说明
FROM pg_policies
WHERE tablename = 'user_companies'
ORDER BY policyname;

-- 9. 完成提示
SELECT 
  '✅ 权限修复完成！' AS 消息,
  '现在认证用户和服务角色都可以创建公司和关联记录了' AS 说明;


