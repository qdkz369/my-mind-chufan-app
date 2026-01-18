-- ============================================
-- 创建 rental_deposits 表（押金收退记录表）
-- 用于独立追踪押金的收退历史
-- ============================================

-- 创建 rental_deposits 表
CREATE TABLE IF NOT EXISTS rental_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联订单
  rental_order_id UUID NOT NULL REFERENCES rental_orders(id) ON DELETE CASCADE,
  
  -- 押金类型：received（收到）、refunded（退还）
  deposit_type VARCHAR(20) NOT NULL,
  CHECK (deposit_type IN ('received', 'refunded')),
  
  -- 金额
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  
  -- 退款信息（仅当 deposit_type = 'refunded' 时使用）
  refund_reason TEXT,  -- 退款原因
  refund_at TIMESTAMP WITH TIME ZONE,  -- 退款时间
  refund_proof TEXT,  -- 退款凭证（图片URL或转账凭证）
  
  -- 操作人信息
  operator_id UUID,  -- 操作人ID（记录是谁操作的）
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_rental_deposits_order_id ON rental_deposits(rental_order_id);
CREATE INDEX IF NOT EXISTS idx_rental_deposits_type ON rental_deposits(deposit_type);
CREATE INDEX IF NOT EXISTS idx_rental_deposits_refund_at ON rental_deposits(refund_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_deposits_created_at ON rental_deposits(created_at DESC);

-- 创建自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_rental_deposits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rental_deposits_updated_at_trigger
BEFORE UPDATE ON rental_deposits
FOR EACH ROW
EXECUTE FUNCTION update_rental_deposits_updated_at();

-- 启用 RLS
ALTER TABLE rental_deposits ENABLE ROW LEVEL SECURITY;

-- RLS 策略：服务角色完全访问
CREATE POLICY "Service role full access to rental_deposits"
  ON rental_deposits FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- RLS 策略：认证用户可以查看自己订单的押金记录
CREATE POLICY "Users can view their rental deposits"
  ON rental_deposits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rental_orders
      WHERE rental_orders.id = rental_deposits.rental_order_id
      AND rental_orders.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- RLS 策略：认证用户可以插入押金记录
CREATE POLICY "Users can insert rental deposits"
  ON rental_deposits FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS 策略：认证用户可以更新押金记录
CREATE POLICY "Users can update rental deposits"
  ON rental_deposits FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 添加表注释
COMMENT ON TABLE rental_deposits IS '押金收退记录表：记录每个租赁订单的押金收退历史';
COMMENT ON COLUMN rental_deposits.rental_order_id IS '关联的租赁订单ID';
COMMENT ON COLUMN rental_deposits.deposit_type IS '押金类型：received(收到)、refunded(退还)';
COMMENT ON COLUMN rental_deposits.amount IS '金额';
COMMENT ON COLUMN rental_deposits.refund_reason IS '退款原因（仅退款时使用）';
COMMENT ON COLUMN rental_deposits.refund_at IS '退款时间（仅退款时使用）';
COMMENT ON COLUMN rental_deposits.refund_proof IS '退款凭证（仅退款时使用）';
COMMENT ON COLUMN rental_deposits.operator_id IS '操作人ID';

-- 验证表是否创建成功
SELECT 
  'rental_deposits 表创建成功！' AS 消息,
  column_name AS 字段名,
  data_type AS 数据类型,
  is_nullable AS 可空
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'rental_deposits'
ORDER BY ordinal_position;
