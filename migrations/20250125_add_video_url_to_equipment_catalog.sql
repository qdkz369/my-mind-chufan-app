-- ============================================
-- 为 equipment_catalog 表添加视频 URL 字段
-- 用于存储设备展示视频，提高客户决策效率
-- ============================================

-- 1. 检查 video_url 字段是否已存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'equipment_catalog' 
    AND column_name = 'video_url'
  ) THEN
    -- 添加 video_url 字段
    ALTER TABLE equipment_catalog 
    ADD COLUMN video_url TEXT;
    
    RAISE NOTICE '✅ video_url 字段已添加到 equipment_catalog 表';
  ELSE
    RAISE NOTICE 'ℹ️ video_url 字段已存在，跳过添加';
  END IF;
END $$;

-- 2. 添加字段注释
COMMENT ON COLUMN equipment_catalog.video_url IS '设备展示视频URL，用于动态展示设备功能和使用场景，提高客户租赁或购买决策效率';

-- 3. 验证字段添加成功
SELECT 
  'equipment_catalog 表字段验证' AS info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'equipment_catalog'
  AND column_name IN ('images', 'video_url')
ORDER BY column_name;
