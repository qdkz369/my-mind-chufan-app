-- ============================================
-- 创建状态变更日志表
-- 用于记录所有状态变更历史
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
  changed_by UUID, -- 操作人ID（可关联 users 表）
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
COMMENT ON COLUMN status_change_logs.changed_by IS '操作人ID';
COMMENT ON COLUMN status_change_logs.reason IS '变更原因';


