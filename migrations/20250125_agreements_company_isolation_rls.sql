-- ============================================
-- agreements 表公司隔离 RLS 策略
-- 实现数据库层面的多租户数据隔离
-- ============================================

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "agreements_policy_all" ON agreements;
DROP POLICY IF EXISTS "Allow all select on agreements" ON agreements;
DROP POLICY IF EXISTS "Allow all insert on agreements" ON agreements;
DROP POLICY IF EXISTS "Allow all update on agreements" ON agreements;
DROP POLICY IF EXISTS "Allow all delete on agreements" ON agreements;
DROP POLICY IF EXISTS "agreements_company_isolation" ON agreements;

-- ============================================
-- 方案 1：使用 user_companies 表（推荐）
-- 优点：不需要设置 session variable，直接通过 auth.uid() 查询
-- ============================================

-- 策略 1：SELECT - 用户只能查看自己公司的协议或平台通用协议
CREATE POLICY "agreements_company_isolation_select"
ON agreements
FOR SELECT
TO authenticated
USING (
  -- 条件 1：协议属于用户所在的公司
  company_id IN (
    SELECT company_id 
    FROM user_companies 
    WHERE user_id = auth.uid()
  )
  OR
  -- 条件 2：平台通用协议（company_id IS NULL）
  company_id IS NULL
);

-- 策略 2：INSERT - 用户只能创建自己公司的协议或平台通用协议
CREATE POLICY "agreements_company_isolation_insert"
ON agreements
FOR INSERT
TO authenticated
WITH CHECK (
  -- 条件 1：协议属于用户所在的公司
  company_id IN (
    SELECT company_id 
    FROM user_companies 
    WHERE user_id = auth.uid()
  )
  OR
  -- 条件 2：平台通用协议（company_id IS NULL）
  company_id IS NULL
);

-- 策略 3：UPDATE - 用户只能更新自己公司的协议或平台通用协议
CREATE POLICY "agreements_company_isolation_update"
ON agreements
FOR UPDATE
TO authenticated
USING (
  -- 条件 1：协议属于用户所在的公司
  company_id IN (
    SELECT company_id 
    FROM user_companies 
    WHERE user_id = auth.uid()
  )
  OR
  -- 条件 2：平台通用协议（company_id IS NULL）
  company_id IS NULL
)
WITH CHECK (
  -- 更新后的 company_id 也必须符合条件
  company_id IN (
    SELECT company_id 
    FROM user_companies 
    WHERE user_id = auth.uid()
  )
  OR
  company_id IS NULL
);

-- 策略 4：DELETE - 用户只能删除自己公司的协议或平台通用协议
CREATE POLICY "agreements_company_isolation_delete"
ON agreements
FOR DELETE
TO authenticated
USING (
  -- 条件 1：协议属于用户所在的公司
  company_id IN (
    SELECT company_id 
    FROM user_companies 
    WHERE user_id = auth.uid()
  )
  OR
  -- 条件 2：平台通用协议（company_id IS NULL）
  company_id IS NULL
);

-- ============================================
-- 策略 5：服务角色完全访问（API 路由使用 serviceRoleKey 时绕过 RLS）
-- ============================================

DROP POLICY IF EXISTS "Service role full access to agreements" ON agreements;
CREATE POLICY "Service role full access to agreements"
  ON agreements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 方案 2：使用 current_setting（备选方案）
-- 注意：需要在查询前设置 session variable
-- 使用方式：SET LOCAL app.current_company_id = 'company-uuid';
-- ============================================

-- 如果需要使用 current_setting 方案，取消下面的注释：
/*
DROP POLICY IF EXISTS "agreements_company_isolation_select" ON agreements;
DROP POLICY IF EXISTS "agreements_company_isolation_insert" ON agreements;
DROP POLICY IF EXISTS "agreements_company_isolation_update" ON agreements;
DROP POLICY IF EXISTS "agreements_company_isolation_delete" ON agreements;

CREATE POLICY "agreements_company_isolation"
ON agreements
FOR SELECT
TO authenticated
USING (
  -- 从 session variable 获取 company_id
  company_id = current_setting('app.current_company_id', true)::uuid
  OR
  -- 平台通用协议
  company_id IS NULL
);
*/

-- ============================================
-- 验证策略
-- ============================================

SELECT 
  tablename AS 表名,
  policyname AS 策略名称,
  cmd AS 操作类型,
  roles AS 角色
FROM pg_policies
WHERE tablename = 'agreements'
ORDER BY policyname;

-- ============================================
-- 测试查询（在应用中使用）
-- ============================================

-- 测试 1：查看当前用户可访问的协议
-- SELECT * FROM agreements;

-- 测试 2：查看策略是否生效
-- EXPLAIN SELECT * FROM agreements;
