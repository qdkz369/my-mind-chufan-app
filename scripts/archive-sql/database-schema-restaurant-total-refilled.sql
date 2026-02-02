-- ============================================
-- 为 restaurants 表添加 total_refilled 字段
-- ============================================

-- 添加 total_refilled 字段（累计加注总量，单位：升）
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS total_refilled NUMERIC(12, 2) DEFAULT 0;

-- 添加注释
COMMENT ON COLUMN restaurants.total_refilled IS '累计加注总量（升），包括固定油箱加注和钢瓶容量';

-- 创建索引（如果需要按总量排序）
CREATE INDEX IF NOT EXISTS idx_restaurants_total_refilled ON restaurants(total_refilled);

