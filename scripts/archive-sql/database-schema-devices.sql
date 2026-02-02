-- 创建 devices 表
CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  install_date TIMESTAMP WITH TIME ZONE NOT NULL,
  address TEXT NOT NULL,
  installer TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 如果表已存在，添加 installer 字段（如果不存在）
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS installer TEXT;

-- 为 devices 表创建索引
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_is_locked ON devices(is_locked);
CREATE INDEX IF NOT EXISTS idx_devices_created_at ON devices(created_at);

-- 修改 fuel_level 表，添加 device_id 字段
ALTER TABLE fuel_level 
ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 创建外键约束（可选，如果需要强制引用完整性）
-- ALTER TABLE fuel_level 
-- ADD CONSTRAINT fk_fuel_level_device_id 
-- FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE SET NULL;

-- 为 fuel_level 表的 device_id 创建索引
CREATE INDEX IF NOT EXISTS idx_fuel_level_device_id ON fuel_level(device_id);

-- 创建触发器，自动更新 devices 表的 updated_at
CREATE OR REPLACE FUNCTION update_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_devices_updated_at_trigger
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_devices_updated_at();

-- 启用实时订阅（如果需要）
-- ALTER PUBLICATION supabase_realtime ADD TABLE devices;
-- ALTER PUBLICATION supabase_realtime ADD TABLE fuel_level;

-- 插入示例数据（可选）
-- INSERT INTO devices (device_id, model, install_date, address, status, is_locked)
-- VALUES 
--   ('DEV001', '智能燃料监控系统 V2.0', '2024-01-15 10:00:00+08', '昆明市五华区xxx路123号', 'online', false),
--   ('DEV002', '智能燃料监控系统 V2.0', '2024-02-20 14:30:00+08', '昆明市盘龙区yyy路456号', 'online', false)
-- ON CONFLICT (device_id) DO NOTHING;

