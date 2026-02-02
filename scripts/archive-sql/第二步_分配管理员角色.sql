-- ============================================
-- 第二步：为管理员用户分配角色
-- 请在执行完第一步后，再执行此脚本
-- ============================================

-- 为管理员用户分配 super_admin 角色
-- 请将 '9e2724e9-9b4b-4ddd-a647-9b32a6520b32' 替换为你的实际用户 UUID
INSERT INTO user_roles (user_id, role)
VALUES ('9e2724e9-9b4b-4ddd-a647-9b32a6520b32', 'super_admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';

-- 验证角色是否分配成功
SELECT 
  u.email AS 用户邮箱,
  ur.role AS 角色,
  ur.created_at AS 创建时间
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id = '9e2724e9-9b4b-4ddd-a647-9b32a6520b32';


