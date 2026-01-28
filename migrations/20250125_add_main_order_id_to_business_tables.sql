-- ============================================
-- 为业务订单表添加 main_order_id 字段
-- 用于关联 order_main 表
-- ============================================

-- 1. 为 delivery_orders 表添加 main_order_id 字段
ALTER TABLE delivery_orders
ADD COLUMN IF NOT EXISTS main_order_id UUID REFERENCES order_main(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_orders_main_order_id ON delivery_orders(main_order_id);

COMMENT ON COLUMN delivery_orders.main_order_id IS '关联的 order_main 表主订单ID';

-- 2. 为 rental_orders 表添加 main_order_id 字段
ALTER TABLE rental_orders
ADD COLUMN IF NOT EXISTS main_order_id UUID REFERENCES order_main(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rental_orders_main_order_id ON rental_orders(main_order_id);

COMMENT ON COLUMN rental_orders.main_order_id IS '关联的 order_main 表主订单ID';

-- 3. 验证字段添加
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'delivery_orders' 
    AND column_name = 'main_order_id'
  ) THEN
    RAISE NOTICE '✅ delivery_orders.main_order_id 字段已添加';
  ELSE
    RAISE EXCEPTION '❌ delivery_orders.main_order_id 字段添加失败';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_orders' 
    AND column_name = 'main_order_id'
  ) THEN
    RAISE NOTICE '✅ rental_orders.main_order_id 字段已添加';
  ELSE
    RAISE EXCEPTION '❌ rental_orders.main_order_id 字段添加失败';
  END IF;
END $$;
