-- ============================================
-- 创建 filling_logs 表（配送记录表）
-- ============================================

CREATE TABLE IF NOT EXISTS filling_logs (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  delivery_person TEXT NOT NULL,
  container_type TEXT NOT NULL CHECK (container_type IN ('fixed_tank', 'cylinder')),
  -- 固定油箱场景
  fuel_amount_liters NUMERIC(10, 2),
  -- 钢瓶场景
  cylinder_id TEXT,
  -- 通用字段
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location_address TEXT,
  fuel_batch_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_filling_logs_restaurant_id ON filling_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_filling_logs_device_id ON filling_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_filling_logs_delivery_person ON filling_logs(delivery_person);
CREATE INDEX IF NOT EXISTS idx_filling_logs_executed_at ON filling_logs(executed_at);
CREATE INDEX IF NOT EXISTS idx_filling_logs_container_type ON filling_logs(container_type);

-- 启用实时订阅（如果需要）
-- ALTER PUBLICATION supabase_realtime ADD TABLE filling_logs;

