-- ============================================
-- 创建 rental_events 表
-- 用于记录租赁生命周期事件
-- ============================================

CREATE TABLE IF NOT EXISTS rental_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联租赁订单
  rental_order_id UUID NOT NULL REFERENCES rental_orders(id) ON DELETE CASCADE,
  
  -- 事件类型
  event_type VARCHAR(50) NOT NULL, -- 事件类型：order_created, rental_started, monthly_payment, rental_ended
  
  -- 事件时间
  event_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 事件发生时间
  
  -- 操作人ID
  operator_id UUID, -- 操作人ID（用户ID、工人ID等）
  
  -- 元数据（JSON格式，存储额外信息）
  meta JSONB DEFAULT '{}', -- 元数据：如支付金额、支付月份、订单状态等
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_rental_events_order_id ON rental_events(rental_order_id);
CREATE INDEX IF NOT EXISTS idx_rental_events_event_type ON rental_events(event_type);
CREATE INDEX IF NOT EXISTS idx_rental_events_event_at ON rental_events(event_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_events_operator_id ON rental_events(operator_id);
CREATE INDEX IF NOT EXISTS idx_rental_events_order_type ON rental_events(rental_order_id, event_type);

-- 启用 RLS
ALTER TABLE rental_events ENABLE ROW LEVEL SECURITY;

-- RLS 策略：服务角色完全访问
CREATE POLICY "Service role full access to rental_events"
  ON rental_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- RLS 策略：认证用户可以查看自己订单的事件
CREATE POLICY "Users can view their rental events"
  ON rental_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rental_orders
      WHERE rental_orders.id = rental_events.rental_order_id
      AND rental_orders.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- RLS 策略：认证用户可以插入事件（用于记录）
CREATE POLICY "Users can insert rental events"
  ON rental_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 添加表注释
COMMENT ON TABLE rental_events IS '租赁事件表：记录租赁生命周期中的所有关键事件';
COMMENT ON COLUMN rental_events.rental_order_id IS '关联的租赁订单ID';
COMMENT ON COLUMN rental_events.event_type IS '事件类型：order_created(创建订单)、rental_started(开始租赁)、monthly_payment(每月支付)、rental_ended(结束租赁)';
COMMENT ON COLUMN rental_events.event_at IS '事件发生时间';
COMMENT ON COLUMN rental_events.operator_id IS '操作人ID（用户ID、工人ID等）';
COMMENT ON COLUMN rental_events.meta IS '元数据（JSON格式），存储事件相关的额外信息';

-- 验证表是否创建成功
SELECT 
  'rental_events 表创建成功！' AS 消息,
  column_name AS 字段名,
  data_type AS 数据类型,
  is_nullable AS 可空
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'rental_events'
ORDER BY ordinal_position;
