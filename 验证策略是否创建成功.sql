-- ============================================
-- 验证 rental_orders 表的 RLS 策略
-- ============================================

-- 查看所有策略
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  roles AS 角色,
  CASE 
    WHEN roles = '{service_role}' THEN '✅ 服务角色（API使用）'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户（前端使用）'
    ELSE roles::text
  END AS 说明
FROM pg_policies 
WHERE tablename = 'rental_orders'
ORDER BY policyname;

-- 检查 RLS 是否启用
SELECT 
  tablename AS 表名,
  rowsecurity AS RLS已启用,
  CASE 
    WHEN rowsecurity THEN '✅ RLS 已启用'
    ELSE '❌ RLS 未启用'
  END AS 状态
FROM pg_tables 
WHERE tablename = 'rental_orders';


