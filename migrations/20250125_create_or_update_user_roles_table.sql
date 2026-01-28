-- ============================================
-- 创建或更新 user_roles 表
-- 支持新的角色系统：platform_admin, company_admin 等
-- ============================================

-- 检查并创建 user_roles 表
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 清理和迁移现有角色数据，然后更新约束
DO $$
DECLARE
  role_info RECORD;
BEGIN
  -- 首先显示当前角色数据
  RAISE NOTICE '当前数据库中的角色数据：';
  FOR role_info IN 
    SELECT role, COUNT(*) as count 
    FROM user_roles 
    GROUP BY role 
    ORDER BY role
  LOOP
    RAISE NOTICE '  - %: % 个用户', role_info.role, role_info.count;
  END LOOP;
  
  -- 第一步：删除旧的约束（允许我们进行数据迁移）
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%user_roles_role_check%'
  ) THEN
    ALTER TABLE user_roles DROP CONSTRAINT user_roles_role_check;
    RAISE NOTICE '✅ 已删除旧的角色约束，现在可以自由迁移数据。';
  END IF;
  
  -- 第二步：迁移旧角色到新角色系统
  RAISE NOTICE '开始迁移角色数据...';
  
  -- 迁移 admin -> platform_admin
  UPDATE user_roles 
  SET role = 'platform_admin', updated_at = NOW()
  WHERE role = 'admin';
  RAISE NOTICE '  ✅ admin -> platform_admin';
  
  -- 迁移 user -> staff  
  UPDATE user_roles 
  SET role = 'staff', updated_at = NOW()
  WHERE role = 'user';
  RAISE NOTICE '  ✅ user -> staff';
  
  -- 迁移 worker -> staff
  UPDATE user_roles 
  SET role = 'staff', updated_at = NOW()
  WHERE role = 'worker';
  RAISE NOTICE '  ✅ worker -> staff';
  
  -- 迁移 supplier -> factory
  UPDATE user_roles 
  SET role = 'factory', updated_at = NOW()
  WHERE role = 'supplier';
  RAISE NOTICE '  ✅ supplier -> factory';
  
  -- 处理任何其他未知角色，设为 staff
  UPDATE user_roles 
  SET role = 'staff', updated_at = NOW()
  WHERE role NOT IN ('super_admin', 'platform_admin', 'company_admin', 'staff', 'factory', 'filler');
  RAISE NOTICE '  ✅ 其他未知角色 -> staff';
  
  RAISE NOTICE '角色迁移完成。';
  
  -- 第三步：添加新的角色约束
  ALTER TABLE user_roles 
  ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN (
    'super_admin',      -- 系统级（全平台）
    'platform_admin',   -- 平台运营
    'company_admin',    -- 公司管理员
    'staff',           -- 员工
    'factory',         -- 工厂
    'filler'           -- 充装工
  ));
  
  RAISE NOTICE '✅ 新的角色约束已创建。';
  
  -- 显示迁移后的角色统计
  RAISE NOTICE '迁移后的角色分布：';
  FOR role_info IN 
    SELECT role, COUNT(*) as count 
    FROM user_roles 
    GROUP BY role 
    ORDER BY 
      CASE role 
        WHEN 'super_admin' THEN 1
        WHEN 'platform_admin' THEN 2
        WHEN 'company_admin' THEN 3
        WHEN 'staff' THEN 4
        WHEN 'factory' THEN 5
        WHEN 'filler' THEN 6
        ELSE 7
      END
  LOOP
    RAISE NOTICE '  - %: % 个用户', role_info.role, role_info.count;
  END LOOP;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 启用 RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 删除所有现有的 RLS 策略并重新创建
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    -- 删除现有的策略
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_roles', policy_name);
    END LOOP;
END $$;

-- RLS 策略：服务角色完全访问
CREATE POLICY "Service role full access to user_roles"
  ON user_roles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- RLS 策略：用户只能查看自己的角色
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS 策略：超级管理员和平台管理员可以查看所有角色
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_admin')
    )
  );

-- RLS 策略：超级管理员和平台管理员可以插入角色
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_admin')
    )
  );

-- RLS 策略：超级管理员和平台管理员可以更新角色
CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_admin')
    )
  );

-- RLS 策略：超级管理员和平台管理员可以删除角色
CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_admin')
    )
  );

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_roles_updated_at ON user_roles;
CREATE TRIGGER trigger_update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_roles_updated_at();

-- 角色迁移已在上面的 DO 块中完成

-- 显示迁移后的角色统计
SELECT 
  '角色迁移结果' AS 信息类型,
  ur.role AS 角色,
  COUNT(*) AS 用户数量
FROM user_roles ur
GROUP BY ur.role
ORDER BY 
    CASE ur.role 
        WHEN 'super_admin' THEN 1
        WHEN 'platform_admin' THEN 2
        WHEN 'company_admin' THEN 3
        WHEN 'staff' THEN 4
        WHEN 'factory' THEN 5
        WHEN 'filler' THEN 6
        ELSE 7
    END;

-- 验证表结构
SELECT 
  table_name AS 表名,
  column_name AS 字段名,
  data_type AS 数据类型,
  is_nullable AS 可空
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 验证约束
SELECT 
  constraint_name AS 约束名,
  constraint_type AS 约束类型
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
  AND table_name = 'user_roles';

-- 验证RLS策略
SELECT 
  policyname AS 策略名,
  permissive AS 许可类型,
  roles AS 适用角色,
  cmd AS 命令类型
FROM pg_policies 
WHERE tablename = 'user_roles' AND schemaname = 'public';

-- 显示当前角色数据
SELECT 
  ur.role AS 角色,
  COUNT(*) AS 用户数量
FROM user_roles ur
GROUP BY ur.role
ORDER BY ur.role;