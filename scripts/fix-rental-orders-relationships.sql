-- ============================================
-- 修复 rental_orders 与 restaurants/equipment 的外键关系
-- 用途：解决 PostgREST PGRST200 "Could not find a relationship between
--       rental_orders and restaurants in the schema cache"
-- 执行：在 Supabase Dashboard → SQL Editor 中执行后，刷新 API 或重启服务
-- ============================================

-- 1. 确保 rental_orders.restaurant_id 引用 restaurants(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'rental_orders'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%restaurant%'
  ) THEN
    ALTER TABLE rental_orders
    ADD CONSTRAINT rental_orders_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL;
    RAISE NOTICE '已添加 rental_orders.restaurant_id -> restaurants(id) 外键';
  ELSE
    RAISE NOTICE 'rental_orders 与 restaurants 外键已存在';
  END IF;
END $$;

-- 2. 若存在 equipment 表，确保 rental_orders.equipment_id 引用 equipment(id)（可为空则不加约束也可）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equipment') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'rental_orders'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%equipment%'
    ) THEN
      ALTER TABLE rental_orders
      ADD CONSTRAINT rental_orders_equipment_id_fkey
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL;
      RAISE NOTICE '已添加 rental_orders.equipment_id -> equipment(id) 外键';
    END IF;
  END IF;
END $$;

-- 3. 若存在 provider_id 列，确保引用 companies(id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rental_orders' AND column_name = 'provider_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'rental_orders'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%provider%'
    ) THEN
      ALTER TABLE rental_orders
      ADD CONSTRAINT rental_orders_provider_id_fkey
      FOREIGN KEY (provider_id) REFERENCES companies(id) ON DELETE SET NULL;
      RAISE NOTICE '已添加 rental_orders.provider_id -> companies(id) 外键';
    END IF;
  END IF;
END $$;
