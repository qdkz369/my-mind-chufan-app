-- ============================================
-- 创建 rental_billing_cycles 表
-- 用于表示每个租赁订单的应收账期
-- 每个订单每月一条记录
-- ============================================

CREATE TABLE IF NOT EXISTS rental_billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联租赁订单
  rental_order_id UUID NOT NULL REFERENCES rental_orders(id) ON DELETE CASCADE,
  
  -- 账期信息
  cycle_number INTEGER NOT NULL, -- 账期序号（1, 2, 3...）
  cycle_month VARCHAR(7) NOT NULL, -- 账期月份（格式：YYYY-MM，例如：2025-01）
  due_date DATE NOT NULL, -- 到期日期（应收日期）
  
  -- 金额信息
  amount_due DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- 应收金额
  amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- 已收金额
  
  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 状态：pending(待支付), paid(已支付), partial(部分支付), overdue(逾期)
  
  -- 支付信息
  paid_at TIMESTAMP WITH TIME ZONE, -- 支付时间（最后一次支付时间）
  payment_method VARCHAR(50), -- 支付方式（最后一次支付方式）
  payment_proof TEXT, -- 支付凭证（图片URL，最后一次）
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束：同一订单的同一月份只能有一条记录
  UNIQUE(rental_order_id, cycle_month)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_billing_cycles_order_id ON rental_billing_cycles(rental_order_id);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_cycle_month ON rental_billing_cycles(cycle_month);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_due_date ON rental_billing_cycles(due_date);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_status ON rental_billing_cycles(status);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_order_month ON rental_billing_cycles(rental_order_id, cycle_month);

-- 创建自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_rental_billing_cycles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rental_billing_cycles_updated_at_trigger
BEFORE UPDATE ON rental_billing_cycles
FOR EACH ROW
EXECUTE FUNCTION update_rental_billing_cycles_updated_at();

-- 启用 RLS
ALTER TABLE rental_billing_cycles ENABLE ROW LEVEL SECURITY;

-- RLS 策略：服务角色完全访问
CREATE POLICY "Service role full access to rental_billing_cycles"
  ON rental_billing_cycles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- RLS 策略：认证用户可以查看自己订单的账期
CREATE POLICY "Users can view their rental billing cycles"
  ON rental_billing_cycles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rental_orders
      WHERE rental_orders.id = rental_billing_cycles.rental_order_id
      AND rental_orders.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- RLS 策略：认证用户可以插入账期记录（系统自动生成）
CREATE POLICY "Users can insert rental billing cycles"
  ON rental_billing_cycles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS 策略：认证用户可以更新账期记录（支付时更新）
CREATE POLICY "Users can update rental billing cycles"
  ON rental_billing_cycles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 添加表注释
COMMENT ON TABLE rental_billing_cycles IS '租赁账期表：记录每个租赁订单的每月应收账期';
COMMENT ON COLUMN rental_billing_cycles.rental_order_id IS '关联的租赁订单ID';
COMMENT ON COLUMN rental_billing_cycles.cycle_number IS '账期序号（1, 2, 3...）';
COMMENT ON COLUMN rental_billing_cycles.cycle_month IS '账期月份（格式：YYYY-MM）';
COMMENT ON COLUMN rental_billing_cycles.due_date IS '到期日期（应收日期）';
COMMENT ON COLUMN rental_billing_cycles.amount_due IS '应收金额';
COMMENT ON COLUMN rental_billing_cycles.amount_paid IS '已收金额';
COMMENT ON COLUMN rental_billing_cycles.status IS '状态：pending(待支付)、paid(已支付)、partial(部分支付)、overdue(逾期)';

-- 验证表是否创建成功
SELECT 
  'rental_billing_cycles 表创建成功！' AS 消息,
  column_name AS 字段名,
  data_type AS 数据类型,
  is_nullable AS 可空
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'rental_billing_cycles'
ORDER BY ordinal_position;
