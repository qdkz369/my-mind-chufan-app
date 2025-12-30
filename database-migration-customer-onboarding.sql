-- ============================================
-- 客户获客导向闭环 - 数据库迁移脚本
-- ============================================

-- 1. 为 restaurants 表添加新字段
-- 添加 status 字段（枚举值：'active', 'unactivated'）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'status') THEN
    ALTER TABLE restaurants ADD COLUMN status TEXT DEFAULT 'unactivated' CHECK (status IN ('active', 'unactivated'));
  ELSE
    -- 如果已存在，确保约束正确
    ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_status_check;
    ALTER TABLE restaurants ADD CONSTRAINT restaurants_status_check CHECK (status IN ('active', 'unactivated'));
  END IF;
END
$$;

-- 添加联系人信息字段
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 添加GPS位置字段
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS location TEXT; -- 格式化的坐标字符串 "latitude,longitude"

-- 为 restaurants 表创建索引
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_created_at ON restaurants(created_at);

-- 2. 确保 devices 表的 restaurant_id 字段存在（如果之前没有）
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS restaurant_id UUID;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_devices_restaurant_id ON devices(restaurant_id);

-- 3. 更新现有餐厅的状态（如果有设备关联，则设为 active，否则保持 unactivated）
DO $$
BEGIN
  UPDATE restaurants r
  SET status = CASE 
    WHEN EXISTS (
      SELECT 1 FROM devices d 
      WHERE d.restaurant_id = r.id
    ) THEN 'active'
    ELSE COALESCE(r.status, 'unactivated')
  END
  WHERE r.status IS NULL;
END
$$;

-- ============================================
-- 迁移完成
-- ============================================

