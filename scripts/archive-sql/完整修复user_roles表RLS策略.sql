-- ============================================
-- 完整修复 user_roles 表的 RLS 策略
-- 解决查询和插入权限问题
-- ============================================

-- 1. 删除所有现有策略（避免冲突）
DROP POLICY IF EXISTS "Service role full access to user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON user_roles;

-- 2. 确保 RLS 已启用
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 3. 创建新的 RLS 策略

-- 策略1：服务角色完全访问（用于后端 API）
CREATE POLICY "Service role full access to user_roles"
  ON user_roles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 策略2：认证用户可以查看自己的角色（重要：使用 auth.uid()）
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

-- 策略5：管理员可以查看所有角色（用于管理界面）
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- 4. 验证策略是否创建成功
SELECT 
  policyname AS 策略名称,
  tablename AS 表名,
  permissive AS 是否允许,
  roles AS 角色,
  cmd AS 命令类型
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- 5. 测试查询（使用当前认证用户）
-- 注意：这个查询需要在有认证会话的情况下执行
SELECT 
  user_id,
  role,
  created_at
FROM user_roles
WHERE user_id = auth.uid();


