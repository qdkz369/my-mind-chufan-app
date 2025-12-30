-- 创建配送日志表
CREATE TABLE IF NOT EXISTS delivery_logs (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  tank_id TEXT NOT NULL,
  delivery_person TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为配送日志表创建索引
CREATE INDEX IF NOT EXISTS idx_delivery_logs_device_id ON delivery_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_tank_id ON delivery_logs(tank_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_delivery_person ON delivery_logs(delivery_person);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_executed_at ON delivery_logs(executed_at);

-- 修改 fuel_level 表，添加 current_tank_id 字段
ALTER TABLE fuel_level 
ADD COLUMN IF NOT EXISTS current_tank_id TEXT;

-- 为 fuel_level 表的 current_tank_id 创建索引
CREATE INDEX IF NOT EXISTS idx_fuel_level_current_tank_id ON fuel_level(current_tank_id);

-- 启用实时订阅（如果需要）
-- ALTER PUBLICATION supabase_realtime ADD TABLE delivery_logs;

