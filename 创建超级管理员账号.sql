-- ============================================
-- 创建超级管理员账号
-- 在 Supabase Auth 中创建初始管理员用户
-- ============================================

-- 方法1：使用 Supabase Auth Admin API（推荐）
-- 注意：这需要在 Supabase Dashboard 的 SQL Editor 中执行
-- 或者使用 Supabase Management API

-- 由于 Supabase Auth 的用户表是受保护的，我们使用以下方法：

-- ============================================
-- 方法1：通过 Supabase Dashboard 手动创建
-- ============================================
-- 1. 进入 Supabase Dashboard
-- 2. 点击 "Authentication" -> "Users"
-- 3. 点击 "Add user" -> "Create new user"
-- 4. 填写：
--    - Email: admin@example.com (或你的邮箱)
--    - Password: 你的密码
--    - Auto Confirm User: 是
-- 5. 创建后，复制用户的 UUID（在用户列表中可以看到）

-- ============================================
-- 方法2：使用 SQL 直接插入（需要 service_role 权限）
-- ============================================
-- 注意：这需要在 Supabase SQL Editor 中使用 service_role 权限执行

-- 创建管理员用户（使用 Supabase 的 auth.users 表）
-- 注意：密码需要使用 Supabase 的加密格式
-- 这里提供一个示例，实际密码需要先加密

-- 由于直接插入 auth.users 比较复杂，建议使用方法1

-- ============================================
-- 方法3：创建用户元数据表（推荐用于权限管理）
-- ============================================

-- 创建用户角色表（用于存储用户角色信息）
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user', 'worker', 'supplier')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 启用 RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

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

-- RLS 策略：管理员可以查看所有角色
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

-- ============================================
-- 使用说明
-- ============================================
-- 1. 首先在 Supabase Dashboard 中手动创建管理员用户（方法1）
-- 2. 获取创建的用户 UUID
-- 3. 执行以下 SQL 为该用户分配超级管理员角色：
--
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('你的用户UUID', 'super_admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
--
-- ============================================
-- 验证查询
-- ============================================
-- 查看所有管理员：
-- SELECT u.email, ur.role, u.created_at
-- FROM auth.users u
-- JOIN user_roles ur ON u.id = ur.user_id
-- WHERE ur.role IN ('super_admin', 'admin')
-- ORDER BY u.created_at;


