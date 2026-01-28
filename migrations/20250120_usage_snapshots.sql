-- ============================================
-- Usage Snapshots 表创建 - 阶段 E
-- 创建日期: 2025-01-20
-- 说明: 创建 usage_snapshots 表用于冻结设备在某一时间窗口内的"可计费使用事实"
-- 设计原则:
--   - 只消费 Facts 结果，不反向影响 Facts
--   - 不包含任何结算、支付、发票逻辑
--   - 字段设计需支持未来多种计费模型
--   - 不与 orders 表产生强耦合
--   - usage_value 只是"量"，不是"钱"
--   - 金融合规底线：无 amount / price / fee / total 字段
-- ============================================

-- ============================================
-- 创建 usage_snapshots 表（计费前快照）
-- ============================================

-- 说明：
-- - 用于冻结设备在某一时间窗口内的"可计费使用事实"
-- - 只消费 Facts 结果，不反向影响 Facts
-- - usage_value 只是"量"（使用量），不是"钱"（金额）
-- - fact_source 明确写死来源，确保可追溯
-- - status=locked 后不可修改（业务逻辑约束，不在数据库层面强制）
CREATE TABLE IF NOT EXISTS usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_contract_id UUID NOT NULL,
  device_id UUID NOT NULL,
  snapshot_start_at TIMESTAMPTZ NOT NULL,
  snapshot_end_at TIMESTAMPTZ NOT NULL,
  usage_metric VARCHAR(50) NOT NULL,
  CHECK (usage_metric IN ('hours', 'orders', 'energy', 'hybrid')),
  usage_value DECIMAL(20, 6) NOT NULL,
  -- 说明：usage_value 只是"量"（使用量），不是"钱"（金额）
  -- 例如：hours=100（小时数）、orders=50（订单数）、energy=1000.5（能耗值）
  fact_source VARCHAR(50) NOT NULL,
  CHECK (fact_source IN ('order_facts', 'device_facts', 'manual_override')),
  -- 说明：fact_source 明确写死来源，确保可追溯
  -- order_facts: 来自订单事实（Facts API）
  -- device_facts: 来自设备事实（Facts API）
  -- manual_override: 手动覆盖（特殊情况）
  generated_from_fact_at TIMESTAMPTZ NOT NULL,
  -- 说明：Facts 中最新事实时间，用于追溯快照生成时的 Facts 状态
  status VARCHAR(50) NOT NULL,
  CHECK (status IN ('draft', 'confirmed', 'disputed', 'locked')),
  -- 说明：status=locked 后不可修改（业务逻辑约束，不在数据库层面强制）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 创建索引
-- ============================================

-- 租赁合同ID索引（查询某个合同的所有快照）
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_rental_contract_id ON usage_snapshots(rental_contract_id);

-- 设备ID索引（查询某个设备的所有快照）
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_device_id ON usage_snapshots(device_id);

-- 快照时间范围索引（按时间窗口查询）
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_start_at ON usage_snapshots(snapshot_start_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_end_at ON usage_snapshots(snapshot_end_at DESC);

-- 状态索引（查询不同状态的快照）
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_status ON usage_snapshots(status);

-- 使用量计量单位索引（按计量单位查询）
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_usage_metric ON usage_snapshots(usage_metric);

-- 事实来源索引（按来源查询）
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_fact_source ON usage_snapshots(fact_source);

-- 复合索引：合同ID + 状态（查询某个合同的已确认/已锁定快照）
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_contract_status ON usage_snapshots(rental_contract_id, status);

-- 复合索引：设备ID + 时间范围（查询某个设备在特定时间段的快照）
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_device_time ON usage_snapshots(device_id, snapshot_start_at, snapshot_end_at);

-- 复合索引：合同ID + 设备ID + 状态（查询某个合同下某个设备的快照）
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_contract_device_status ON usage_snapshots(rental_contract_id, device_id, status);

-- ============================================
-- RLS 策略（宽松策略，不强制拦截）
-- ============================================

-- 启用 RLS
ALTER TABLE usage_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS 策略：基于公司隔离
DROP POLICY IF EXISTS "Allow all select on usage_snapshots" ON usage_snapshots;
CREATE POLICY "usage_snapshots_company_isolation_select"
  ON usage_snapshots FOR SELECT
  TO authenticated
  USING (
    -- 通过设备查询关联公司
    device_id IN (
      SELECT d.device_id 
      FROM devices d 
      JOIN restaurants r ON d.restaurant_id = r.id 
      WHERE r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow all insert on usage_snapshots" ON usage_snapshots;
CREATE POLICY "usage_snapshots_company_isolation_insert"
  ON usage_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    device_id IN (
      SELECT d.device_id 
      FROM devices d 
      JOIN restaurants r ON d.restaurant_id = r.id 
      WHERE r.user_id = auth.uid()
    )
  );

-- RLS 策略：基于公司隔离更新
-- 注意：status=locked 的不可修改约束由业务逻辑层实现
DROP POLICY IF EXISTS "Allow all update on usage_snapshots" ON usage_snapshots;
CREATE POLICY "usage_snapshots_company_isolation_update"
  ON usage_snapshots FOR UPDATE
  TO authenticated
  USING (
    device_id IN (
      SELECT d.device_id 
      FROM devices d 
      JOIN restaurants r ON d.restaurant_id = r.id 
      WHERE r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    device_id IN (
      SELECT d.device_id 
      FROM devices d 
      JOIN restaurants r ON d.restaurant_id = r.id 
      WHERE r.user_id = auth.uid()
    )
  );

-- Service role 完全访问策略
CREATE POLICY "Service role full access to usage_snapshots"
ON usage_snapshots FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================
-- 验证表创建
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_snapshots') THEN
    RAISE NOTICE '✅ usage_snapshots 表创建成功';
  ELSE
    RAISE WARNING '❌ usage_snapshots 表创建失败';
  END IF;
END $$;
