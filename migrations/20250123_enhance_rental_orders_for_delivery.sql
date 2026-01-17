-- ============================================
-- 增强 rental_orders 表，支持工人配送和验证
-- 执行日期：2025-01-23
-- 说明：添加工人ID、送达时间、配送验证信息等字段
-- ============================================

-- 1. 添加工人ID字段（关联 workers 表）
ALTER TABLE rental_orders 
  ADD COLUMN IF NOT EXISTS worker_id UUID;

-- 2. 添加送达时间字段
ALTER TABLE rental_orders 
  ADD COLUMN IF NOT EXISTS delivery_time TIMESTAMPTZ;

-- 3. 添加配送验证信息（JSONB格式，包含设备种类、送达时间、客户确认等信息）
ALTER TABLE rental_orders 
  ADD COLUMN IF NOT EXISTS delivery_verification JSONB DEFAULT '{}';

-- 4. 添加每月支付记录（JSONB格式，记录每月支付情况）
ALTER TABLE rental_orders 
  ADD COLUMN IF NOT EXISTS monthly_payments JSONB DEFAULT '[]';

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_rental_orders_worker_id ON rental_orders(worker_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_delivery_time ON rental_orders(delivery_time);
CREATE INDEX IF NOT EXISTS idx_rental_orders_order_status ON rental_orders(order_status);

-- 6. 添加注释
COMMENT ON COLUMN rental_orders.worker_id IS '负责配送的工人ID';
COMMENT ON COLUMN rental_orders.delivery_time IS '设备送达时间';
COMMENT ON COLUMN rental_orders.delivery_verification IS '配送验证信息（JSONB）：包含设备种类、送达时间、客户确认签收等信息';
COMMENT ON COLUMN rental_orders.monthly_payments IS '每月支付记录（JSONB数组）：记录每月租金支付情况';

-- 7. 验证字段是否添加成功
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'rental_orders'
  AND column_name IN ('worker_id', 'delivery_time', 'delivery_verification', 'monthly_payments')
ORDER BY column_name;
