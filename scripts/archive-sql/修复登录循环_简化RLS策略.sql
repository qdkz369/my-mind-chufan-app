-- ============================================
-- 修复登录循环问题 - 简化 RLS 策略
-- 解决前端无法读取 user_roles 表的问题
-- ============================================

-- 1. 先删掉所有旧的复杂策略，清空干扰
DROP POLICY IF EXISTS "Service role full access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "service_role_all" ON public.user_roles;
DROP POLICY IF EXISTS "users_read_own_role" ON public.user_roles;

-- 2. 确保 RLS 已开启
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. 策略一：允许 Service Role（后台 API）做任何事
-- 注意：使用 USING (true) WITH CHECK (true) 给予 service_role 完全权限
-- 因为 service_role 本身就拥有最高权限，不需要检查 JWT
CREATE POLICY "service_role_all" ON public.user_roles 
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. 策略二：允许任何已登录用户查看【自己】的角色
-- 这是解决登录循环的关键，确保登录后前端能读到角色
CREATE POLICY "users_read_own_role" ON public.user_roles
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. 策略三：允许用户插入自己的角色记录（首次登录时可能需要）
CREATE POLICY "users_insert_own_role" ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. 策略四：允许用户更新自己的角色记录
CREATE POLICY "users_update_own_role" ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. 验证策略是否创建成功
SELECT 
  policyname AS 策略名称,
  tablename AS 表名,
  permissive AS 是否允许,
  roles AS 角色,
  cmd AS 命令类型
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;


