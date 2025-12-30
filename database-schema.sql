-- 配送员GPS位置表
-- 用于存储配送员手机的实时GPS定位
CREATE TABLE IF NOT EXISTS delivery_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id TEXT UNIQUE NOT NULL, -- 配送员ID
  lat NUMERIC(10, 7) NOT NULL, -- 纬度
  lon NUMERIC(10, 7) NOT NULL, -- 经度
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL, -- 最后更新时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_delivery_locations_delivery_id ON delivery_locations(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_locations_updated_at ON delivery_locations(updated_at DESC);

-- 商户注册定位地址表
-- 用于存储商户注册时的GPS定位地址
CREATE TABLE IF NOT EXISTS merchant_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id TEXT UNIQUE NOT NULL, -- 商户ID
  lat NUMERIC(10, 7) NOT NULL, -- 纬度
  lon NUMERIC(10, 7) NOT NULL, -- 经度
  address TEXT, -- 详细地址
  city TEXT, -- 城市
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL, -- 注册时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_merchant_locations_merchant_id ON merchant_locations(merchant_id);

-- 启用实时订阅（如果需要）
-- ALTER PUBLICATION supabase_realtime ADD TABLE delivery_locations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE merchant_locations;


