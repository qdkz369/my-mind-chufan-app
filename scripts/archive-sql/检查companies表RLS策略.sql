-- ============================================
-- 检查 companies 表的 RLS 策略
-- 如果前端无法查询到创建的供应商，可能是 RLS 策略问题
-- ============================================

-- 1. 检查 companies 表是否启用了 RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'companies';

-- 2. 查看现有的 RLS 策略
SELECT 
  policyname AS 策略名称,
  tablename AS 表名,
  permissive AS 是否允许,
  roles AS 角色,
  cmd AS 命令类型,
  qual AS 查询条件,
  with_check AS 检查条件
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

-- 3. 检查是否有允许 authenticated 用户查看所有公司的策略
-- 如果没有，需要创建以下策略：

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Authenticated users can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Service role full access to companies" ON public.companies;

-- 确保 RLS 已启用
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 策略一：允许 Service Role（后台 API）做任何事
CREATE POLICY "Service role full access to companies"
ON public.companies
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 策略二：允许任何已登录用户查看所有公司
-- 这是关键：管理员需要能看到所有供应商
CREATE POLICY "Authenticated users can view all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

-- 策略三：允许已登录用户创建公司
CREATE POLICY "Authenticated users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 策略四：允许已登录用户更新公司
CREATE POLICY "Authenticated users can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 策略五：允许已登录用户删除公司
CREATE POLICY "Authenticated users can delete companies"
ON public.companies
FOR DELETE
TO authenticated
USING (true);

-- 4. 验证策略是否创建成功
SELECT 
  policyname AS 策略名称,
  tablename AS 表名,
  permissive AS 是否允许,
  roles AS 角色,
  cmd AS 命令类型
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

-- 5. 测试查询（需要以 authenticated 用户身份执行）
-- 在 Supabase Dashboard 的 SQL Editor 中，使用 anon key 测试：
-- SELECT * FROM companies LIMIT 10;
