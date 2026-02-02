-- 升级devices表，添加container_type字段
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS container_type TEXT CHECK (container_type IN ('fixed_tank', 'mobile_bottle')) DEFAULT 'mobile_bottle';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_devices_container_type ON devices(container_type);

-- 创建钢瓶信息表（用于流动钢瓶场景）
CREATE TABLE IF NOT EXISTS bottles (
  bottle_id TEXT PRIMARY KEY,
  production_date DATE,
  production_batch TEXT,
  filling_date DATE,
  filling_batch TEXT,
  capacity_liters NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为钢瓶表创建索引
CREATE INDEX IF NOT EXISTS idx_bottles_status ON bottles(status);
CREATE INDEX IF NOT EXISTS idx_bottles_production_batch ON bottles(production_batch);
CREATE INDEX IF NOT EXISTS idx_bottles_filling_batch ON bottles(filling_batch);

-- 创建燃料批次信息表
CREATE TABLE IF NOT EXISTS fuel_batches (
  batch_id TEXT PRIMARY KEY,
  batch_number TEXT NOT NULL UNIQUE,
  fuel_type TEXT NOT NULL,
  production_date DATE,
  expiry_date DATE,
  quantity_liters NUMERIC(10, 2),
  supplier TEXT,
  quality_certificate TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为燃料批次表创建索引
CREATE INDEX IF NOT EXISTS idx_fuel_batches_batch_number ON fuel_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_fuel_batches_fuel_type ON fuel_batches(fuel_type);

-- 升级delivery_logs表，添加更多字段
ALTER TABLE delivery_logs 
ADD COLUMN IF NOT EXISTS container_type TEXT CHECK (container_type IN ('fixed_tank', 'mobile_bottle'));

ALTER TABLE delivery_logs 
ADD COLUMN IF NOT EXISTS fuel_amount_liters NUMERIC(10, 2);

ALTER TABLE delivery_logs 
ADD COLUMN IF NOT EXISTS fuel_batch_id TEXT;

ALTER TABLE delivery_logs 
ADD COLUMN IF NOT EXISTS location_address TEXT;

ALTER TABLE delivery_logs 
ADD COLUMN IF NOT EXISTS performance_type TEXT CHECK (performance_type IN ('volume', 'count'));

ALTER TABLE delivery_logs 
ADD COLUMN IF NOT EXISTS performance_value NUMERIC(10, 2);

-- 创建外键约束（可选）
-- ALTER TABLE delivery_logs 
-- ADD CONSTRAINT fk_delivery_logs_fuel_batch 
-- FOREIGN KEY (fuel_batch_id) REFERENCES fuel_batches(batch_id) ON DELETE SET NULL;

-- 为delivery_logs表创建索引
CREATE INDEX IF NOT EXISTS idx_delivery_logs_container_type ON delivery_logs(container_type);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_fuel_batch_id ON delivery_logs(fuel_batch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_performance_type ON delivery_logs(performance_type);

-- 创建触发器，自动更新bottles表的updated_at
CREATE OR REPLACE FUNCTION update_bottles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bottles_updated_at_trigger
BEFORE UPDATE ON bottles
FOR EACH ROW
EXECUTE FUNCTION update_bottles_updated_at();

-- 启用实时订阅（如果需要）
-- ALTER PUBLICATION supabase_realtime ADD TABLE bottles;
-- ALTER PUBLICATION supabase_realtime ADD TABLE fuel_batches;

