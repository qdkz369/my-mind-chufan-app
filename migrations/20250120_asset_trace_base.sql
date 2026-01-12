-- ============================================
-- 资产溯源地基扩展 - 阶段 2B-3.5
-- 创建日期: 2025-01-20
-- 说明: 在不破坏现有 2B-3 功能验证的前提下，引入资产全生命周期溯源的基础结构
-- 设计策略: 地基刚性、规则弹性
-- ============================================

-- ============================================
-- 1️⃣ 数据库资产层扩展
-- ============================================

-- 1.1 创建 gas_cylinders 表（资产档案表）
-- id 用作二维码标识，manufacturer_id 可为空
-- status 不使用 enum，不加 check constraint（保持弹性）
CREATE TABLE IF NOT EXISTS gas_cylinders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID, -- 可为空
  status TEXT, -- 不使用 enum，不加 check constraint，保持弹性
  production_date DATE,
  last_inspect_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 gas_cylinders 索引
CREATE INDEX IF NOT EXISTS idx_gas_cylinders_manufacturer_id ON gas_cylinders(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_gas_cylinders_status ON gas_cylinders(status);
CREATE INDEX IF NOT EXISTS idx_gas_cylinders_created_at ON gas_cylinders(created_at DESC);

-- 1.2 创建 trace_logs 表（资产溯源流水表，只允许插入）
-- 不允许 update / delete，仅 append
CREATE TABLE IF NOT EXISTS trace_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES gas_cylinders(id) ON DELETE CASCADE,
  operator_id UUID, -- 操作员ID
  action_type TEXT NOT NULL, -- 出厂 / 充装 / 配送 / 回收 / 安检
  order_id UUID, -- 关联订单ID（可为空）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 trace_logs 索引
CREATE INDEX IF NOT EXISTS idx_trace_logs_asset_id ON trace_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_trace_logs_operator_id ON trace_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_trace_logs_action_type ON trace_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_trace_logs_order_id ON trace_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_trace_logs_created_at ON trace_logs(created_at DESC);

-- 禁止对 trace_logs 表进行 UPDATE 和 DELETE 操作
-- 通过函数触发器实现只允许插入
CREATE OR REPLACE FUNCTION prevent_trace_logs_update_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'trace_logs 表不允许 UPDATE 操作，仅允许 INSERT';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'trace_logs 表不允许 DELETE 操作，仅允许 INSERT';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：禁止 UPDATE
DROP TRIGGER IF EXISTS trigger_prevent_trace_logs_update ON trace_logs;
CREATE TRIGGER trigger_prevent_trace_logs_update
  BEFORE UPDATE ON trace_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_trace_logs_update_delete();

-- 创建触发器：禁止 DELETE
DROP TRIGGER IF EXISTS trigger_prevent_trace_logs_delete ON trace_logs;
CREATE TRIGGER trigger_prevent_trace_logs_delete
  BEFORE DELETE ON trace_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_trace_logs_update_delete();

-- ============================================
-- 2️⃣ RLS 策略（宽松策略，不强制拦截）
-- ============================================

-- 启用 RLS
ALTER TABLE gas_cylinders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_logs ENABLE ROW LEVEL SECURITY;

-- gas_cylinders RLS 策略：允许所有人查询（宽松策略）
DROP POLICY IF EXISTS "Allow all select on gas_cylinders" ON gas_cylinders;
CREATE POLICY "Allow all select on gas_cylinders"
  ON gas_cylinders FOR SELECT
  USING (true); -- 允许所有人查询

DROP POLICY IF EXISTS "Allow all insert on gas_cylinders" ON gas_cylinders;
CREATE POLICY "Allow all insert on gas_cylinders"
  ON gas_cylinders FOR INSERT
  WITH CHECK (true); -- 允许所有人插入

DROP POLICY IF EXISTS "Allow all update on gas_cylinders" ON gas_cylinders;
CREATE POLICY "Allow all update on gas_cylinders"
  ON gas_cylinders FOR UPDATE
  USING (true)
  WITH CHECK (true); -- 允许所有人更新

-- trace_logs RLS 策略：允许所有人查询和插入（宽松策略，因为只允许插入）
DROP POLICY IF EXISTS "Allow all select on trace_logs" ON trace_logs;
CREATE POLICY "Allow all select on trace_logs"
  ON trace_logs FOR SELECT
  USING (true); -- 允许所有人查询

DROP POLICY IF EXISTS "Allow all insert on trace_logs" ON trace_logs;
CREATE POLICY "Allow all insert on trace_logs"
  ON trace_logs FOR INSERT
  WITH CHECK (true); -- 允许所有人插入

-- ============================================
-- 完成
-- ============================================

-- 验证表创建
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gas_cylinders') THEN
    RAISE NOTICE '✅ gas_cylinders 表创建成功';
  ELSE
    RAISE WARNING '❌ gas_cylinders 表创建失败';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trace_logs') THEN
    RAISE NOTICE '✅ trace_logs 表创建成功';
  ELSE
    RAISE WARNING '❌ trace_logs 表创建失败';
  END IF;
END $$;
