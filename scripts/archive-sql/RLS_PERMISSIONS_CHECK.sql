-- ============================================
-- Supabase RLS 权限检查与修复 SQL 脚本
-- ============================================
-- 用途：检查并修复 orders 表的 RLS 策略，确保管理员和工人可以读取订单数据
-- 执行方式：在 Supabase Dashboard 的 SQL Editor 中运行此脚本
-- ============================================

-- 1. 检查当前 RLS 策略状态
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- 2. 检查 RLS 是否启用
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'orders';

-- 3. 临时禁用 RLS（仅用于测试，生产环境请谨慎使用）
-- ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- 4. 启用 RLS（如果已禁用）
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 5. 删除可能存在的旧策略（可选，如果策略名称冲突）
-- DROP POLICY IF EXISTS "Allow admin read orders" ON orders;
-- DROP POLICY IF EXISTS "Allow worker read orders" ON orders;
-- DROP POLICY IF EXISTS "Allow authenticated read orders" ON orders;

-- 6. 创建管理员读取策略
-- 假设管理员角色为 'admin' 或通过 user_metadata.role 判断
CREATE POLICY "Allow admin read orders"
ON orders
FOR SELECT
TO authenticated
USING (
  -- 方式1：如果使用 user_metadata.role 字段
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR
  -- 方式2：如果使用 users 表的 role 字段（需要关联查询）
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' = 'admin' OR auth.users.raw_user_meta_data->>'role' = 'Admin')
  )
  OR
  -- 方式3：允许所有已认证用户读取（临时方案，用于测试）
  auth.role() = 'authenticated'
);

-- 7. 创建工人读取策略
CREATE POLICY "Allow worker read orders"
ON orders
FOR SELECT
TO authenticated
USING (
  -- 方式1：如果使用 user_metadata.role 字段
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'worker'
  OR
  -- 方式2：如果使用 users 表的 role 字段
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' = 'worker' OR auth.users.raw_user_meta_data->>'role' = 'Worker')
  )
  OR
  -- 方式3：允许工人读取分配给自己的订单或待处理的订单
  (
    assigned_to = auth.uid()::text
    OR worker_id = auth.uid()::text
    OR status = 'pending'
  )
);

-- 8. 创建通用读取策略（如果上述策略不适用，使用此策略作为后备）
-- 注意：此策略允许所有已认证用户读取所有订单，请根据实际需求调整
CREATE POLICY "Allow authenticated read all orders"
ON orders
FOR SELECT
TO authenticated
USING (true);

-- 9. 验证策略是否创建成功
SELECT 
  policyname,
  cmd,
  roles,
  qual as "USING expression"
FROM pg_policies
WHERE tablename = 'orders';

-- 10. 测试查询（在应用中使用）
-- 在 Supabase Dashboard 的 Table Editor 中，尝试查询 orders 表
-- 如果查询成功，说明 RLS 策略配置正确

-- ============================================
-- 故障排查步骤
-- ============================================
-- 1. 如果查询仍然失败，检查：
--    - auth.uid() 是否返回正确的用户 ID
--    - user_metadata.role 字段是否正确设置
--    - 用户是否已通过身份验证

-- 2. 临时测试：禁用 RLS 查看是否能查询到数据
--    ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
--    -- 测试查询
--    SELECT * FROM orders LIMIT 10;
--    -- 如果查询成功，说明问题在 RLS 策略
--    -- 如果查询失败，说明问题在表结构或数据本身

-- 3. 检查用户角色设置：
--    SELECT 
--      id,
--      email,
--      raw_user_meta_data->>'role' as role,
--      raw_user_meta_data
--    FROM auth.users;

-- 4. 如果使用 service_role 密钥（绕过 RLS）：
--    确保在应用代码中使用正确的 Supabase 客户端
--    管理员端应使用 service_role 密钥（如果配置了）
--    工人端应使用 anon 密钥（受 RLS 保护）

-- ============================================
-- 推荐的最终策略（根据实际需求选择）
-- ============================================
-- 方案A：基于角色的策略（推荐）
-- 如果用户表中有 role 字段，使用此方案

-- 方案B：基于数据所有权的策略
-- 如果订单有明确的 owner 字段，使用此方案

-- 方案C：完全开放策略（仅用于开发测试）
-- 允许所有已认证用户读取所有订单

-- ============================================
-- 注意事项
-- ============================================
-- 1. 在生产环境中，请根据实际业务需求调整策略
-- 2. 定期检查 RLS 策略，确保符合安全要求
-- 3. 使用 Supabase Dashboard 的 Policy Editor 可视化编辑策略
-- 4. 测试时可以使用 "Allow authenticated read all orders" 策略作为临时方案

