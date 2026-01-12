-- ============================================
-- 优化 user_roles 表的 RLS 策略
-- 修复递归查询问题，确保登录时能正确查询角色
-- ============================================

-- 1. 删除所有现有策略
DROP POLICY IF EXISTS "Service role full access to user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON user_roles;

-- 2. 确保 RLS 已启用
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 3. 创建优化的 RLS 策略

-- 策略1：服务角色完全访问（用于后端 API，绕过 RLS）
CREATE POLICY "Service role full access to user_roles"
  ON user_roles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 策略2：认证用户可以查看自己的角色（最重要：这是登录时查询的关键策略）
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 策略3：认证用户可以插入自己的角色记录
CREATE POLICY "Users can insert their own role"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 策略4：认证用户可以更新自己的角色记录
CREATE POLICY "Users can update their own role"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 策略5：管理员可以查看所有角色（使用 SECURITY DEFINER 函数避免递归问题）
-- 先创建一个辅助函数
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  );
END;
$$;

-- 使用函数来检查管理员权限（避免递归查询）
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (is_admin_user());

-- 4. 验证策略是否创建成功
SELECT 
  policyname AS 策略名称,
  tablename AS 表名,
  cmd AS 命令类型,
  roles AS 角色
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- 5. 验证函数是否创建成功
SELECT 
  routine_name AS 函数名,
  routine_type AS 类型
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin_user';


