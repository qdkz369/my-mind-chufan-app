-- ============================================
-- 数据库升级脚本：餐厅和设备关联
-- ============================================

-- 1. 创建 restaurants 表（如果不存在）
CREATE TABLE IF NOT EXISTS restaurants (
  restaurant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  contact_person TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为 restaurants 表创建索引
CREATE INDEX IF NOT EXISTS idx_restaurants_name ON restaurants(name);
CREATE INDEX IF NOT EXISTS idx_restaurants_created_at ON restaurants(created_at);

-- 2. 在 restaurants 表中添加 qr_token 字段
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE;

-- 为 qr_token 创建索引（用于快速查找）
CREATE INDEX IF NOT EXISTS idx_restaurants_qr_token ON restaurants(qr_token);

-- 3. 在 devices 表中添加 restaurant_id 字段
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS restaurant_id TEXT;

-- 创建外键约束，关联到 restaurants 表
-- 注意：如果 devices 表中已有数据，需要先确保所有 restaurant_id 都存在于 restaurants 表中
-- 或者可以先添加字段，然后更新数据，最后再添加外键约束

-- 先创建索引
CREATE INDEX IF NOT EXISTS idx_devices_restaurant_id ON devices(restaurant_id);

-- 添加外键约束（如果数据已准备好）
-- ALTER TABLE devices 
-- ADD CONSTRAINT fk_devices_restaurant_id 
-- FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE SET NULL;

-- 4. 在 devices 表中添加 container_type 字段（枚举值：fixed_tank, cylinder）
-- 注意：如果之前已经有 container_type 字段，需要先检查并更新值
DO $$
BEGIN
  -- 如果 container_type 字段不存在，则添加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'container_type'
  ) THEN
    ALTER TABLE devices ADD COLUMN container_type TEXT CHECK (container_type IN ('fixed_tank', 'cylinder'));
  ELSE
    -- 如果字段已存在，更新约束以确保只允许 fixed_tank 和 cylinder
    -- 先删除旧的约束（如果存在）
    ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_container_type_check;
    -- 添加新的约束
    ALTER TABLE devices ADD CONSTRAINT devices_container_type_check 
    CHECK (container_type IN ('fixed_tank', 'cylinder'));
    -- 如果之前的值是 'mobile_bottle'，更新为 'cylinder'
    UPDATE devices SET container_type = 'cylinder' WHERE container_type = 'mobile_bottle';
  END IF;
END
$$;

-- 为 container_type 创建索引
CREATE INDEX IF NOT EXISTS idx_devices_container_type ON devices(container_type);

-- 5. 在 devices 表中添加 last_cylinder_id 字段（用于记录当前钢瓶身份）
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS last_cylinder_id TEXT;

-- 为 last_cylinder_id 创建索引
CREATE INDEX IF NOT EXISTS idx_devices_last_cylinder_id ON devices(last_cylinder_id);

-- 6. 创建触发器，自动更新 restaurants 表的 updated_at
CREATE OR REPLACE FUNCTION update_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 如果触发器已存在，先删除
DROP TRIGGER IF EXISTS update_restaurants_updated_at_trigger ON restaurants;

-- 创建触发器
CREATE TRIGGER update_restaurants_updated_at_trigger
BEFORE UPDATE ON restaurants
FOR EACH ROW
EXECUTE FUNCTION update_restaurants_updated_at();

-- 7. 可选：为 qr_token 生成唯一值的函数（如果需要自动生成）
-- 这个函数可以在插入新餐厅时自动生成唯一的 qr_token
CREATE OR REPLACE FUNCTION generate_qr_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  -- 生成一个基于时间戳和随机数的唯一 token
  token := 'REST_' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '_' || 
           LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- 确保 token 唯一（如果已存在，则重新生成）
  WHILE EXISTS (SELECT 1 FROM restaurants WHERE qr_token = token) LOOP
    token := 'REST_' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '_' || 
             LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- 8. 启用实时订阅（如果需要）
-- ALTER PUBLICATION supabase_realtime ADD TABLE restaurants;

-- ============================================
-- 使用说明：
-- ============================================
-- 1. 执行此脚本后，restaurants 表将包含 qr_token 字段
-- 2. devices 表将包含 restaurant_id、container_type 和 last_cylinder_id 字段
-- 3. 如果 devices 表中已有数据，需要手动更新 restaurant_id 和 container_type
-- 4. 添加外键约束前，确保所有 restaurant_id 都存在于 restaurants 表中
-- 
-- 示例数据插入：
-- INSERT INTO restaurants (restaurant_id, name, address, qr_token) 
-- VALUES ('REST001', '张记餐厅', '昆明市五华区xxx路123号', generate_qr_token());
-- 
-- UPDATE devices SET restaurant_id = 'REST001', container_type = 'cylinder' 
-- WHERE device_id = 'DEV001';

