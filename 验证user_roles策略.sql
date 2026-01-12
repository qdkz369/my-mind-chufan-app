-- ============================================
-- 验证 user_roles 表的 RLS 策略
-- ============================================

-- 1. 检查所有策略
SELECT 
  policyname AS 策略名称,
  tablename AS 表名,
  permissive AS 是否允许,
  roles AS 角色,
  cmd AS 命令类型
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- 2. 检查函数是否存在
SELECT 
  routine_name AS 函数名,
  routine_type AS 类型,
  data_type AS 返回类型
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin_user';

-- 3. 检查 RLS 是否启用
SELECT 
  tablename AS 表名,
  rowsecurity AS RLS已启用
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_roles';

-- 4. 如果策略不存在，重新创建（简化版，不使用函数）
-- 先删除可能存在的函数
DROP FUNCTION IF EXISTS is_admin_user() CASCADE;

-- 删除所有策略
DROP POLICY IF EXISTS "Service role full access to user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON user_roles;

-- 重新创建策略（简化版，不使用递归查询）
CREATE POLICY "Service role full access to user_roles"
  ON user_roles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own role"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 暂时移除管理员查看所有角色的策略（避免递归问题）
-- 如果需要，可以通过后端 API 来实现

-- 再次验证
SELECT 
  policyname AS 策略名称,
  tablename AS 表名,
  cmd AS 命令类型
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;


