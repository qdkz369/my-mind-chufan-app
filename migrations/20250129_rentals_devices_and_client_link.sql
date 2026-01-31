-- ============================================
-- 租赁工作台 rentals 表：多设备 + 客户端关联
-- 执行日期：2025-01-29
-- 说明：支持多种类设备（devices JSONB）、关联客户门店（restaurant_id）、来源（client_apply/admin_create）
-- ============================================

-- 1. 关联客户/门店（可选，用于与客户端数据连通）
ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS restaurant_id UUID;

-- 2. 来源：后台新增 / 客户申请
ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin_create';

-- 3. 多设备明细（JSONB）：[{ "device_name": "", "device_sn": "" }, ...]，空则沿用 device_name/device_sn
ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS devices JSONB DEFAULT '[]';

-- 4. 约束与索引
ALTER TABLE public.rentals
  DROP CONSTRAINT IF EXISTS rentals_source_check;
ALTER TABLE public.rentals
  ADD CONSTRAINT rentals_source_check CHECK (source IN ('admin_create', 'client_apply'));

CREATE INDEX IF NOT EXISTS idx_rentals_restaurant_id ON public.rentals(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_rentals_source ON public.rentals(source);

-- 5. 注释
COMMENT ON COLUMN public.rentals.restaurant_id IS '关联客户门店ID（与客户端数据连通）';
COMMENT ON COLUMN public.rentals.source IS '来源：admin_create=后台新增，client_apply=客户申请';
COMMENT ON COLUMN public.rentals.devices IS '多设备明细 JSONB：[{ device_name, device_sn }, ...]，多种类设备时使用';
