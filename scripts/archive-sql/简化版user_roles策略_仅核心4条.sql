-- ============================================
-- 简化版 user_roles 表 RLS 策略
-- 只创建核心的4条策略，确保登录功能正常
-- ============================================

-- 1. 删除所有现有策略和函数
DROP POLICY IF EXISTS "Service role full access to user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON user_roles;
DROP FUNCTION IF EXISTS is_admin_user() CASCADE;

-- 2. 确保 RLS 已启用
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 3. 创建核心的4条策略（足够支持登录功能）

-- 策略1：服务角色完全访问（用于后端 API）
CREATE POLICY "Service role full access to user_roles"
  ON user_roles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 策略2：认证用户可以查看自己的角色（最重要！登录时查询角色需要这个）
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

-- 注意：暂时不创建"管理员查看所有角色"的策略
-- 因为登录时只需要查询自己的角色，策略2已经足够
-- 如果需要管理员查看所有角色，可以通过后端 API 实现

-- 4. 验证策略
SELECT 
  policyname AS 策略名称,
  tablename AS 表名,
  cmd AS 命令类型
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;


