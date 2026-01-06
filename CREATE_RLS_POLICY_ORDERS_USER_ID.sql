-- ============================================
-- 为 orders 表创建 RLS 策略（基于 user_id）
-- ============================================
-- 用途：确保认证用户只能查看自己的订单数据
-- 执行方式：在 Supabase Dashboard 的 SQL Editor 中运行此脚本
-- ============================================

-- 1. 检查 user_id 列是否存在，如果不存在则添加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'user_id'
  ) THEN
    -- 添加 user_id 列
    ALTER TABLE public.orders 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- 创建索引以提高查询性能
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
    
    RAISE NOTICE 'user_id 列已添加';
  ELSE
    RAISE NOTICE 'user_id 列已存在';
  END IF;
END $$;

-- 2. 启用 RLS（如果尚未启用）
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 3. 删除可能存在的旧策略（如果存在）
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete own orders" ON public.orders;

-- 4. 创建 SELECT 策略：用户只能查看自己的订单
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. 创建 INSERT 策略：用户只能插入自己的订单
CREATE POLICY "Users can insert own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 6. 创建 UPDATE 策略：用户只能更新自己的订单
CREATE POLICY "Users can update own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 7. 创建 DELETE 策略：用户只能删除自己的订单（可选，根据业务需求）
-- 如果需要允许用户删除自己的订单，取消下面的注释
-- CREATE POLICY "Users can delete own orders"
-- ON public.orders
-- FOR DELETE
-- TO authenticated
-- USING (user_id = auth.uid());

-- 8. 验证策略是否创建成功
SELECT 
  policyname,
  cmd,
  roles,
  qual as "USING expression",
  with_check as "WITH CHECK expression"
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- 9. 验证 RLS 是否启用
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'orders';

-- ============================================
-- 测试查询（在应用中使用）
-- ============================================
-- 在 Supabase Dashboard 的 Table Editor 中，尝试查询 orders 表
-- 如果查询成功，说明 RLS 策略配置正确
-- 
-- 测试步骤：
-- 1. 使用一个认证用户的身份登录
-- 2. 查询 orders 表：SELECT * FROM orders;
-- 3. 应该只能看到 user_id 匹配当前用户 ID 的订单
-- 4. 尝试插入一条 user_id 不匹配的订单，应该失败
-- 5. 尝试更新其他用户的订单，应该失败

-- ============================================
-- 注意事项
-- ============================================
-- 1. 此策略假设 user_id 列存储的是 auth.users.id（UUID）
-- 2. 如果 user_id 列存储的是 TEXT 类型，需要修改策略：
--    USING (user_id = auth.uid()::text)
-- 3. 如果需要在插入时自动设置 user_id，可以使用触发器：
--    CREATE OR REPLACE FUNCTION set_user_id()
--    RETURNS TRIGGER AS $$
--    BEGIN
--      IF NEW.user_id IS NULL THEN
--        NEW.user_id = auth.uid();
--      END IF;
--      RETURN NEW;
--    END;
--    $$ LANGUAGE plpgsql SECURITY DEFINER;
--    
--    CREATE TRIGGER set_orders_user_id
--    BEFORE INSERT ON public.orders
--    FOR EACH ROW
--    EXECUTE FUNCTION set_user_id();
-- 4. 如果表中有历史数据，需要更新现有记录的 user_id：
--    -- 根据 restaurant_id 或其他字段更新 user_id（需要根据实际业务逻辑调整）
--    -- UPDATE public.orders 
--    -- SET user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com')
--    -- WHERE user_id IS NULL;
-- 5. 如果需要允许管理员查看所有订单，可以添加额外的策略：
--    CREATE POLICY "Admins can view all orders"
--    ON public.orders
--    FOR SELECT
--    TO authenticated
--    USING (
--      EXISTS (
--        SELECT 1 FROM auth.users
--        WHERE auth.users.id = auth.uid()
--        AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
--             OR auth.users.raw_user_meta_data->>'role' = 'Admin')
--      )
--    );

-- ============================================
-- 故障排查
-- ============================================
-- 如果策略不工作，检查：
-- 1. RLS 是否已启用：SELECT rowsecurity FROM pg_tables WHERE tablename = 'orders';
-- 2. 用户是否已认证：SELECT auth.uid();
-- 3. user_id 列的数据类型是否与 auth.uid() 匹配
-- 4. 策略是否正确创建：SELECT * FROM pg_policies WHERE tablename = 'orders';
-- 5. 测试查询：SELECT * FROM orders WHERE user_id = auth.uid();

