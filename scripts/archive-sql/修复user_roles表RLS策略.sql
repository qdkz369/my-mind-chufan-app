-- ============================================
-- 修复 user_roles 表的 RLS 策略
-- 允许用户插入和更新自己的角色记录
-- ============================================

-- 删除现有的策略（如果存在）
DROP POLICY IF EXISTS "Service role full access to user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON user_roles;

-- 1. 服务角色完全访问（用于后端 API）
CREATE POLICY "Service role full access to user_roles"
  ON user_roles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 2. 用户只能查看自己的角色
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. 用户只能插入自己的角色记录（重要：允许首次登录时创建角色）
CREATE POLICY "Users can insert their own role"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. 用户只能更新自己的角色记录
CREATE POLICY "Users can update their own role"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. 管理员可以查看所有角色
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- 验证策略是否创建成功
SELECT 
  policyname AS 策略名称,
  tablename AS 表名,
  permissive AS 是否允许,
  roles AS 角色,
  cmd AS 命令类型
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;


