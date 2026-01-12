-- ============================================
-- 检查用户角色 - 调试登录权限问题
-- ============================================

-- 1. 查看所有用户及其角色
SELECT 
  u.id AS 用户ID,
  u.email AS 邮箱,
  u.confirmed_at AS 确认时间,
  ur.role AS 角色,
  ur.created_at AS 角色创建时间
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;

-- 2. 查看特定用户的角色（替换邮箱）
SELECT 
  u.id AS 用户ID,
  u.email AS 邮箱,
  ur.role AS 角色,
  ur.id AS 角色记录ID
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@example.com';

-- 3. 检查是否有角色记录但角色值不对
SELECT 
  u.email,
  ur.role,
  CASE 
    WHEN ur.role IS NULL THEN '❌ 没有角色记录'
    WHEN ur.role NOT IN ('super_admin', 'admin') THEN '❌ 角色不是管理员: ' || ur.role
    ELSE '✅ 角色正确'
  END AS 状态
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@example.com';

-- 4. 如果没有角色记录，创建角色记录（替换用户ID）
-- 首先获取用户ID：
-- SELECT id FROM auth.users WHERE email = 'admin@example.com';
-- 然后执行：
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('你的用户ID', 'super_admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
