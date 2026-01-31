-- 设备表关联产品库（与上传设备信息数据通）
-- 创建设备租赁记录时从 equipment_catalog 选型并生成 device 时可追溯来源

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'devices' AND column_name = 'equipment_catalog_id'
  ) THEN
    ALTER TABLE devices ADD COLUMN equipment_catalog_id UUID REFERENCES equipment_catalog(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_devices_equipment_catalog_id ON devices(equipment_catalog_id);
    RAISE NOTICE '✅ devices.equipment_catalog_id 已添加';
  ELSE
    RAISE NOTICE 'ℹ️ devices.equipment_catalog_id 已存在，跳过';
  END IF;
END $$;

COMMENT ON COLUMN devices.equipment_catalog_id IS '来源产品库ID，与上传设备(equipment_catalog)数据通，便于客户选型与后台定制录入';
