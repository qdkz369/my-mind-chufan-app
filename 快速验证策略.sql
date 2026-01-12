-- ============================================
-- 快速验证 user_roles 表的策略
-- ============================================

-- 查看所有策略
SELECT 
  policyname AS 策略名称,
  tablename AS 表名,
  cmd AS 命令类型
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;


