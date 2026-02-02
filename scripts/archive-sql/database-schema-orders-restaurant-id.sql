-- ============================================
-- 为 orders 表添加 restaurant_id 字段（如果不存在）
-- ============================================

-- 检查并添加 restaurant_id 字段
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS restaurant_id TEXT;

-- 创建索引（如果需要按餐厅查询订单）
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);

-- 添加外键约束（如果需要，请在确保数据完整性后取消注释）
-- ALTER TABLE orders
-- ADD CONSTRAINT fk_orders_restaurant
-- FOREIGN KEY (restaurant_id)
-- REFERENCES restaurants(restaurant_id)
-- ON DELETE SET NULL;

