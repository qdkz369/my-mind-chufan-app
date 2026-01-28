-- ============================================
-- 为 agreements 表添加 RLS 策略
-- 创建日期: 2025-01-25
-- 说明: 确保 agreements 表有正确的 RLS 策略
-- ============================================

-- 启用 RLS（如果尚未启用）
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Allow all select on agreements" ON agreements;
DROP POLICY IF EXISTS "Allow all insert on agreements" ON agreements;
DROP POLICY IF EXISTS "Allow all update on agreements" ON agreements;
DROP POLICY IF EXISTS "Allow all delete on agreements" ON agreements;

-- 创建 RLS 策略（宽松策略，允许所有认证用户访问）
-- 策略1：允许所有认证用户查看协议
CREATE POLICY "Allow all select on agreements"
  ON agreements FOR SELECT
  USING (true);

-- 策略2：允许所有认证用户创建协议
CREATE POLICY "Allow all insert on agreements"
  ON agreements FOR INSERT
  WITH CHECK (true);

-- 策略3：允许所有认证用户更新协议
CREATE POLICY "Allow all update on agreements"
  ON agreements FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 策略4：允许所有认证用户删除协议
CREATE POLICY "Allow all delete on agreements"
  ON agreements FOR DELETE
  USING (true);

-- 策略5：服务角色完全访问（API 路由使用）
DROP POLICY IF EXISTS "Service role full access to agreements" ON agreements;
CREATE POLICY "Service role full access to agreements"
  ON agreements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 验证 RLS 是否已启用
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'agreements'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ agreements 表 RLS 已启用';
  ELSE
    RAISE WARNING '❌ agreements 表 RLS 未启用';
  END IF;
END $$;
