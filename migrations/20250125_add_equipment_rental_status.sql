-- ============================================
-- 为 equipment 表添加租赁状态字段
-- 实现设备租赁的"可运营"状态机
-- ============================================

-- 1. 添加 rental_status 字段（租赁状态）
ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS rental_status VARCHAR(20) DEFAULT 'available' 
CHECK (rental_status IN ('available', 'reserved', 'in_use', 'maintenance', 'retired'));

-- 2. 添加 current_rental_order_id 字段（当前占用该设备的租赁订单ID）
ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS current_rental_order_id UUID REFERENCES rental_orders(id) ON DELETE SET NULL;

-- 3. 创建索引，优化查询性能
CREATE INDEX IF NOT EXISTS idx_equipment_rental_status ON equipment(rental_status);
CREATE INDEX IF NOT EXISTS idx_equipment_current_rental_order_id ON equipment(current_rental_order_id) WHERE current_rental_order_id IS NOT NULL;

-- 4. 为现有设备设置默认状态（available）
UPDATE equipment
SET rental_status = 'available'
WHERE rental_status IS NULL;

-- 5. 添加表注释
COMMENT ON COLUMN equipment.rental_status IS '设备租赁状态：available(可租)、reserved(已预订)、in_use(使用中)、maintenance(维护中)、retired(已退役)';
COMMENT ON COLUMN equipment.current_rental_order_id IS '当前占用该设备的租赁订单ID，为空表示设备未被占用';

-- 6. 验证字段是否添加成功
SELECT 
  'equipment 表租赁状态字段添加成功！' AS 消息,
  column_name AS 字段名,
  data_type AS 数据类型,
  column_default AS 默认值
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'equipment'
  AND column_name IN ('rental_status', 'current_rental_order_id');
