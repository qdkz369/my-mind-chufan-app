-- ============================================
-- 审计日志表创建 - 阶段 2B-4
-- 创建日期: 2025-01-20
-- 说明: 创建 audit_logs 表用于记录所有关键状态变更的审计日志
-- ============================================

-- 创建 audit_logs 表（如果尚不存在）
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID, -- 操作者ID（用户ID或工人ID）
  action TEXT NOT NULL, -- 操作类型（如 ORDER_ACCEPT, ORDER_DISPATCH, ORDER_COMPLETE）
  target_type TEXT, -- 目标类型（如 delivery_order, repair_order）
  target_id UUID, -- 目标ID（如订单ID）
  metadata JSONB, -- 额外元数据（JSON格式，可存储任意结构化数据）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 创建复合索引（常用查询场景）
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_action ON audit_logs(actor_id, action);

-- 启用 RLS（可选，当前阶段允许所有人插入和查询）
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS 策略：允许所有人查询和插入（宽松策略，未来可根据需要收紧）
DROP POLICY IF EXISTS "Allow all select on audit_logs" ON audit_logs;
CREATE POLICY "Allow all select on audit_logs"
  ON audit_logs FOR SELECT
  USING (true); -- 允许所有人查询

DROP POLICY IF EXISTS "Allow all insert on audit_logs" ON audit_logs;
CREATE POLICY "Allow all insert on audit_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true); -- 允许所有人插入

-- 验证表创建
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    RAISE NOTICE '✅ audit_logs 表创建成功';
  ELSE
    RAISE WARNING '❌ audit_logs 表创建失败';
  END IF;
END $$;
