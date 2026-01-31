-- ============================================
-- 设备租赁表：设备单价、合计资产总价、待客户确认
-- 创建日期: 2025-01-29
-- 说明: 每条记录含设备单价与合计资产总价（事实记录与租赁关系确认）；
--       支持创建后推送客户端待客户确认形成租赁事实关系。
-- ============================================

-- 1. 新增列（若不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'device_rentals' AND column_name = 'unit_price') THEN
    ALTER TABLE device_rentals ADD COLUMN unit_price NUMERIC(12,2) DEFAULT 0;
    RAISE NOTICE '✅ device_rentals.unit_price 已添加';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'device_rentals' AND column_name = 'total_asset_value') THEN
    ALTER TABLE device_rentals ADD COLUMN total_asset_value NUMERIC(12,2) DEFAULT 0;
    RAISE NOTICE '✅ device_rentals.total_asset_value 已添加';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'device_rentals' AND column_name = 'rental_batch_id') THEN
    ALTER TABLE device_rentals ADD COLUMN rental_batch_id UUID;
    RAISE NOTICE '✅ device_rentals.rental_batch_id 已添加';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'device_rentals' AND column_name = 'customer_confirmed_at') THEN
    ALTER TABLE device_rentals ADD COLUMN customer_confirmed_at TIMESTAMPTZ;
    RAISE NOTICE '✅ device_rentals.customer_confirmed_at 已添加';
  END IF;
END $$;

-- 2. 放宽 status 约束，允许 pending_confirmation（先删后建）
ALTER TABLE device_rentals DROP CONSTRAINT IF EXISTS device_rentals_status_check;
ALTER TABLE device_rentals ADD CONSTRAINT device_rentals_status_check
  CHECK (status IN ('pending_confirmation', 'active', 'ended'));

-- 3. 将现有 active 保留；新创建的可为 pending_confirmation
COMMENT ON COLUMN device_rentals.unit_price IS '设备单价（事实记录，可支持免租金策略）';
COMMENT ON COLUMN device_rentals.total_asset_value IS '本批合计资产总价（事实记录）';
COMMENT ON COLUMN device_rentals.rental_batch_id IS '同一次创建的多条记录共用同一 batch_id';
COMMENT ON COLUMN device_rentals.customer_confirmed_at IS '客户确认时间，确认后形成租赁事实关系';
