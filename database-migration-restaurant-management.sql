-- ============================================
-- 餐厅一站式管理 - 数据库迁移脚本
-- ============================================

-- 1. 创建 restaurants 表
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  qr_token TEXT UNIQUE,
  total_refilled NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为 restaurants 表创建索引
CREATE INDEX IF NOT EXISTS idx_restaurants_qr_token ON restaurants(qr_token);
CREATE INDEX IF NOT EXISTS idx_restaurants_total_refilled ON restaurants(total_refilled);

-- 为 restaurants 表创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_restaurants_updated_at_trigger
BEFORE UPDATE ON restaurants
FOR EACH ROW
EXECUTE FUNCTION update_restaurants_updated_at();

-- 2. 修改 devices 表
-- 添加 restaurant_id 字段（如果不存在）
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS restaurant_id UUID;

-- 添加 container_type 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'container_type') THEN
    ALTER TABLE devices ADD COLUMN container_type TEXT CHECK (container_type IN ('fixed_tank', 'cylinder')) DEFAULT 'cylinder';
  ELSE
    -- 如果已存在，确保约束正确
    ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_container_type_check;
    ALTER TABLE devices ADD CONSTRAINT devices_container_type_check CHECK (container_type IN ('fixed_tank', 'cylinder'));
  END IF;
END
$$;

-- 添加 tank_capacity 字段（如果不存在）
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS tank_capacity NUMERIC(10, 2);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_devices_restaurant_id ON devices(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_devices_container_type ON devices(container_type);

-- 添加外键约束（如果需要，请在确保数据完整性后取消注释）
-- ALTER TABLE devices
-- ADD CONSTRAINT fk_devices_restaurant
-- FOREIGN KEY (restaurant_id)
-- REFERENCES restaurants(id)
-- ON DELETE SET NULL;

-- 3. 创建 gas_cylinders 表（针对流动钢瓶场景）
CREATE TABLE IF NOT EXISTS gas_cylinders (
  id TEXT PRIMARY KEY,
  manufacturer TEXT,
  production_date DATE,
  capacity NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('in_use', 'empty', 'refilling')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为 gas_cylinders 表创建索引
CREATE INDEX IF NOT EXISTS idx_gas_cylinders_status ON gas_cylinders(status);
CREATE INDEX IF NOT EXISTS idx_gas_cylinders_production_date ON gas_cylinders(production_date);

-- 为 gas_cylinders 表创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_gas_cylinders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gas_cylinders_updated_at_trigger
BEFORE UPDATE ON gas_cylinders
FOR EACH ROW
EXECUTE FUNCTION update_gas_cylinders_updated_at();

-- 4. 创建 filling_logs 表（记录每一笔加注/换瓶业务）
-- 注意：如果 filling_logs 表已存在，先检查是否需要迁移数据
DO $$
BEGIN
  -- 如果 filling_logs 表不存在，创建新表
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'filling_logs') THEN
    CREATE TABLE filling_logs (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      restaurant_id UUID,
      delivery_person TEXT NOT NULL,
      operation_type TEXT NOT NULL CHECK (operation_type IN ('refill', 'cylinder_change')),
      fuel_amount_liters NUMERIC(10, 2), -- 加注量（固定油箱场景）
      cylinder_id TEXT, -- 钢瓶ID（流动钢瓶场景）
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      location_address TEXT,
      fuel_batch_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    -- 如果表已存在，添加缺失的字段
    ALTER TABLE filling_logs
    ADD COLUMN IF NOT EXISTS operation_type TEXT;
    
    -- 更新 operation_type 字段（根据 container_type 推断）
    UPDATE filling_logs
    SET operation_type = CASE 
      WHEN container_type = 'fixed_tank' THEN 'refill'
      WHEN container_type = 'cylinder' THEN 'cylinder_change'
      ELSE 'refill'
    END
    WHERE operation_type IS NULL;
    
    -- 添加约束（如果不存在）
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'filling_logs_operation_type_check'
      ) THEN
        ALTER TABLE filling_logs
        ADD CONSTRAINT filling_logs_operation_type_check 
        CHECK (operation_type IN ('refill', 'cylinder_change'));
      END IF;
    END $$;
    
    -- 修改 restaurant_id 字段类型为 UUID（如果原来是 TEXT）
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'filling_logs' 
        AND column_name = 'restaurant_id' 
        AND data_type = 'text'
      ) THEN
        -- 先删除外键约束（如果存在）
        ALTER TABLE filling_logs DROP CONSTRAINT IF EXISTS fk_filling_logs_restaurant;
        -- 修改字段类型（需要先确保数据可以转换）
        -- 注意：如果 restaurant_id 是 TEXT 类型，需要先迁移到 UUID
        -- 这里假设需要手动处理数据迁移
        ALTER TABLE filling_logs ALTER COLUMN restaurant_id TYPE UUID USING NULL;
      END IF;
    END $$;
  END IF;
END
$$;

-- 为 filling_logs 表创建索引
CREATE INDEX IF NOT EXISTS idx_filling_logs_device_id ON filling_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_filling_logs_restaurant_id ON filling_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_filling_logs_delivery_person ON filling_logs(delivery_person);
CREATE INDEX IF NOT EXISTS idx_filling_logs_executed_at ON filling_logs(executed_at);
CREATE INDEX IF NOT EXISTS idx_filling_logs_operation_type ON filling_logs(operation_type);

-- 添加外键约束（如果需要，请在确保数据完整性后取消注释）
-- ALTER TABLE filling_logs
-- ADD CONSTRAINT fk_filling_logs_restaurant
-- FOREIGN KEY (restaurant_id)
-- REFERENCES restaurants(id)
-- ON DELETE SET NULL;

-- ALTER TABLE filling_logs
-- ADD CONSTRAINT fk_filling_logs_cylinder
-- FOREIGN KEY (cylinder_id)
-- REFERENCES gas_cylinders(id)
-- ON DELETE SET NULL;

-- 5. 确保 devices 表的 last_cylinder_id 字段存在（如果之前没有）
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS last_cylinder_id TEXT;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_devices_last_cylinder_id ON devices(last_cylinder_id);

-- 6. 启用实时订阅（如果需要）
-- ALTER PUBLICATION supabase_realtime ADD TABLE restaurants;
-- ALTER PUBLICATION supabase_realtime ADD TABLE gas_cylinders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE filling_logs;

-- ============================================
-- 迁移完成
-- ============================================

