-- ============================================
-- 修复多租户安全漏洞 - 完整 SQL 脚本
-- 请在 Supabase SQL Editor 中按顺序运行
-- ============================================

-- ============================================
-- 第一步：创建 user_companies 关联表
-- 用于管理用户与公司的关联关系
-- ============================================

CREATE TABLE IF NOT EXISTS user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 用户ID（关联 auth.users 表）
  user_id UUID NOT NULL,
  
  -- 公司ID（关联 companies 表）
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- 用户在公司中的角色
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  
  -- 是否为主公司（一个用户可能有多个公司，但只有一个主公司）
  is_primary BOOLEAN DEFAULT false,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束：一个用户在一个公司中只能有一条记录
  UNIQUE(user_id, company_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_companies_user ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_primary ON user_companies(user_id, is_primary) WHERE is_primary = true;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_user_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_companies_updated_at ON user_companies;
CREATE TRIGGER trigger_update_user_companies_updated_at
  BEFORE UPDATE ON user_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_user_companies_updated_at();

-- 启用 RLS
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- RLS 策略：服务角色完全访问
DROP POLICY IF EXISTS "Service role full access to user companies" ON user_companies;
CREATE POLICY "Service role full access to user companies"
  ON user_companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS 策略：用户只能查看自己的公司关联
DROP POLICY IF EXISTS "Users can view their own company associations" ON user_companies;
CREATE POLICY "Users can view their own company associations"
  ON user_companies
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS 策略：用户只能插入自己的公司关联
DROP POLICY IF EXISTS "Users can insert their own company associations" ON user_companies;
CREATE POLICY "Users can insert their own company associations"
  ON user_companies
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 添加注释
COMMENT ON TABLE user_companies IS '用户-公司关联表：管理用户与公司的多对多关系';
COMMENT ON COLUMN user_companies.user_id IS '用户ID（关联 auth.users）';
COMMENT ON COLUMN user_companies.company_id IS '公司ID（关联 companies 表）';
COMMENT ON COLUMN user_companies.role IS '用户在公司中的角色：member(成员)、admin(管理员)、owner(所有者)';
COMMENT ON COLUMN user_companies.is_primary IS '是否为主公司（一个用户可能有多个公司，但只有一个主公司）';

-- ============================================
-- 第二步：创建 status_change_logs 状态变更日志表
-- 用于记录所有业务状态变更历史
-- ============================================

CREATE TABLE IF NOT EXISTS status_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 记录信息
  table_name VARCHAR(50) NOT NULL, -- 表名：rental_orders, repairs, equipment_catalog
  record_id UUID NOT NULL, -- 记录ID
  
  -- 状态变更信息
  old_status VARCHAR(50) NOT NULL, -- 旧状态
  new_status VARCHAR(50) NOT NULL, -- 新状态
  
  -- 操作人信息
  changed_by UUID, -- 操作人ID（关联 auth.users）
  changed_by_name VARCHAR(100), -- 操作人姓名（冗余字段，方便查询）
  
  -- 变更原因
  reason TEXT, -- 变更原因
  
  -- 元数据（JSON格式，存储额外信息）
  metadata JSONB,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_status_logs_table_record ON status_change_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_status_logs_changed_by ON status_change_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_status_logs_created_at ON status_change_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_logs_table_created ON status_change_logs(table_name, created_at DESC);

-- 启用 RLS
ALTER TABLE status_change_logs ENABLE ROW LEVEL SECURITY;

-- RLS 策略：服务角色完全访问
DROP POLICY IF EXISTS "Service role full access to status logs" ON status_change_logs;
CREATE POLICY "Service role full access to status logs"
  ON status_change_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS 策略：认证用户只能查看自己操作过的日志
DROP POLICY IF EXISTS "Users can view their own status logs" ON status_change_logs;
CREATE POLICY "Users can view their own status logs"
  ON status_change_logs
  FOR SELECT
  TO authenticated
  USING (changed_by = auth.uid());

-- 添加注释
COMMENT ON TABLE status_change_logs IS '状态变更日志表：记录所有业务状态变更历史';
COMMENT ON COLUMN status_change_logs.table_name IS '表名：rental_orders, repairs, equipment_catalog 等';
COMMENT ON COLUMN status_change_logs.record_id IS '记录ID';
COMMENT ON COLUMN status_change_logs.old_status IS '变更前的状态';
COMMENT ON COLUMN status_change_logs.new_status IS '变更后的状态';
COMMENT ON COLUMN status_change_logs.changed_by IS '操作人ID（关联 auth.users）';
COMMENT ON COLUMN status_change_logs.reason IS '变更原因';

-- ============================================
-- 第三步：为 rental_orders 表开启 RLS 并创建多租户策略
-- 确保 provider_id 必须匹配当前登录用户的 company_id
-- ============================================

-- 确保 RLS 已启用
ALTER TABLE rental_orders ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Service role full access to rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can view all rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can insert rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can update rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Users can only see their company's rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Providers can only see their own rental orders" ON rental_orders;

-- 策略1：服务角色完全访问（API 路由使用）
CREATE POLICY "Service role full access to rental orders"
  ON rental_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 策略2：认证用户只能查看自己公司的订单（SELECT）
-- 通过 user_companies 表验证用户是否属于该订单的供应商
CREATE POLICY "Users can only see their company's rental orders"
  ON rental_orders
  FOR SELECT
  TO authenticated
  USING (
    -- 如果 provider_id 为 NULL，允许查看（向后兼容）
    provider_id IS NULL
    OR
    -- 如果 provider_id 不为 NULL，检查用户是否属于该公司
    provider_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- 策略3：认证用户只能插入自己公司的订单（INSERT）
CREATE POLICY "Users can only insert rental orders for their company"
  ON rental_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- 如果 provider_id 为 NULL，允许插入（向后兼容）
    provider_id IS NULL
    OR
    -- 如果 provider_id 不为 NULL，检查用户是否属于该公司
    provider_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- 策略4：认证用户只能更新自己公司的订单（UPDATE）
CREATE POLICY "Users can only update their company's rental orders"
  ON rental_orders
  FOR UPDATE
  TO authenticated
  USING (
    -- 检查现有记录的 provider_id
    provider_id IS NULL
    OR
    provider_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- 检查更新后的 provider_id（如果修改了）
    provider_id IS NULL
    OR
    provider_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- 策略5：认证用户只能删除自己公司的订单（DELETE）
CREATE POLICY "Users can only delete their company's rental orders"
  ON rental_orders
  FOR DELETE
  TO authenticated
  USING (
    provider_id IS NULL
    OR
    provider_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 第四步：为 equipment_catalog 表开启 RLS 并创建多租户策略
-- 确保 provider_id 必须匹配当前登录用户的 company_id
-- ============================================

-- 确保 RLS 已启用
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Service role full access to equipment catalog" ON equipment_catalog;
DROP POLICY IF EXISTS "Authenticated users can view approved equipment" ON equipment_catalog;
DROP POLICY IF EXISTS "Authenticated users can create equipment catalog" ON equipment_catalog;
DROP POLICY IF EXISTS "Authenticated users can update their equipment" ON equipment_catalog;
DROP POLICY IF EXISTS "Providers can only see their own equipment" ON equipment_catalog;

-- 策略1：服务角色完全访问（API 路由使用）
CREATE POLICY "Service role full access to equipment catalog"
  ON equipment_catalog
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 策略2：认证用户查看产品（SELECT）
-- 规则：
-- - 供应商只能看到自己的产品（无论审核状态）
-- - 客户只能看到已审核通过且激活的产品
CREATE POLICY "Users can view equipment based on their role"
  ON equipment_catalog
  FOR SELECT
  TO authenticated
  USING (
    -- 如果用户是供应商（在 user_companies 中有记录），可以查看自己的产品
    (
      provider_id IN (
        SELECT company_id 
        FROM user_companies 
        WHERE user_id = auth.uid()
      )
    )
    OR
    -- 如果不是供应商，只能查看已审核通过且激活的产品
    (
      is_approved = true 
      AND status = 'active'
    )
  );

-- 策略3：认证用户只能插入自己公司的产品（INSERT）
CREATE POLICY "Users can only insert equipment for their company"
  ON equipment_catalog
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- provider_id 必须匹配用户的公司ID
    provider_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- 策略4：认证用户只能更新自己公司的产品（UPDATE）
CREATE POLICY "Users can only update their company's equipment"
  ON equipment_catalog
  FOR UPDATE
  TO authenticated
  USING (
    -- 检查现有记录的 provider_id
    provider_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- 检查更新后的 provider_id（不能修改为其他公司）
    provider_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- 策略5：认证用户只能删除自己公司的产品（DELETE）
CREATE POLICY "Users can only delete their company's equipment"
  ON equipment_catalog
  FOR DELETE
  TO authenticated
  USING (
    provider_id IN (
      SELECT company_id 
      FROM user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 第五步：验证所有表和策略是否创建成功
-- ============================================

-- 验证 user_companies 表
SELECT 
  'user_companies 表' AS 表名,
  COUNT(*) AS 字段数量,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ 创建成功'
    ELSE '❌ 创建失败'
  END AS 状态
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_companies';

-- 验证 status_change_logs 表
SELECT 
  'status_change_logs 表' AS 表名,
  COUNT(*) AS 字段数量,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ 创建成功'
    ELSE '❌ 创建失败'
  END AS 状态
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'status_change_logs';

-- 验证 rental_orders 表的 RLS 策略
SELECT 
  'rental_orders RLS 策略' AS 检查项,
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE 
    WHEN roles = '{service_role}' THEN '✅ 服务角色'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户'
    ELSE roles::text
  END AS 角色
FROM pg_policies
WHERE tablename = 'rental_orders'
ORDER BY policyname;

-- 验证 equipment_catalog 表的 RLS 策略
SELECT 
  'equipment_catalog RLS 策略' AS 检查项,
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE 
    WHEN roles = '{service_role}' THEN '✅ 服务角色'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户'
    ELSE roles::text
  END AS 角色
FROM pg_policies
WHERE tablename = 'equipment_catalog'
ORDER BY policyname;

-- 验证 RLS 是否已启用
SELECT 
  schemaname AS 模式,
  tablename AS 表名,
  rowsecurity AS RLS已启用
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_companies', 'status_change_logs', 'rental_orders', 'equipment_catalog')
ORDER BY tablename;

-- ============================================
-- 脚本执行完成
-- ============================================

SELECT 
  '✅ 多租户安全漏洞修复脚本执行完成！' AS 消息,
  NOW() AS 执行时间;


