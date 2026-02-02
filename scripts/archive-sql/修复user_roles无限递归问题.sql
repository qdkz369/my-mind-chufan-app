-- ============================================
-- 修复 user_roles 表 RLS 策略无限递归问题
-- 问题：策略在检查管理员权限时查询 user_roles 表，导致无限递归
-- 解决：使用 SECURITY DEFINER 函数避免递归
-- ============================================

-- 1. 删除所有现有策略（避免冲突）
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_roles', policy_name);
    END LOOP;
END $$;

-- 2. 删除可能存在的旧函数
DROP FUNCTION IF EXISTS is_admin_user() CASCADE;
DROP FUNCTION IF EXISTS check_user_role(text) CASCADE;

-- 3. 创建 SECURITY DEFINER 函数来检查用户角色（避免递归）
-- 这个函数以数据库超级用户权限运行，可以绕过 RLS
CREATE OR REPLACE FUNCTION check_user_role(check_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- 获取当前认证用户的 ID
    current_user_id := auth.uid();
    
    -- 如果没有认证用户，返回 false
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 直接查询 user_roles 表（使用 SECURITY DEFINER 绕过 RLS）
    RETURN EXISTS (
        SELECT 1 
        FROM user_roles
        WHERE user_id = current_user_id
        AND role = check_role
    );
END;
$$;

-- 4. 创建优化的 RLS 策略

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

-- 策略5：管理员可以查看所有角色（使用函数避免递归）
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    check_user_role('super_admin') OR 
    check_user_role('admin') OR
    check_user_role('platform_admin')
  );

-- 策略6：管理员可以插入角色记录
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    check_user_role('super_admin') OR 
    check_user_role('admin') OR
    check_user_role('platform_admin')
  );

-- 策略7：管理员可以更新角色记录
CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    check_user_role('super_admin') OR 
    check_user_role('admin') OR
    check_user_role('platform_admin')
  )
  WITH CHECK (
    check_user_role('super_admin') OR 
    check_user_role('admin') OR
    check_user_role('platform_admin')
  );

-- 策略8：管理员可以删除角色记录
CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    check_user_role('super_admin') OR 
    check_user_role('admin') OR
    check_user_role('platform_admin')
  );

-- 5. 验证策略是否创建成功
SELECT 
  policyname AS "策略名称",
  tablename AS "表名",
  permissive AS "是否允许",
  roles AS "角色",
  cmd AS "命令类型"
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- 6. 验证函数是否创建成功
SELECT 
  routine_name AS "函数名称",
  routine_type AS "函数类型",
  security_type AS "安全类型"
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'check_user_role';

-- ============================================
-- 说明
-- ============================================
-- 1. SECURITY DEFINER 函数以数据库超级用户权限运行，可以绕过 RLS
-- 2. 函数内部直接查询 user_roles 表，不会触发 RLS 策略
-- 3. 策略使用函数来检查权限，避免了无限递归
-- 4. 登录时查询角色会使用策略2（Users can view their own role），不会触发递归
