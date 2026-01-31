-- ============================================
-- rentals 表关联租赁协议（agreement_id）
-- 执行日期：2025-01-29
-- 说明：客户发起或后台创建租赁时关联生效的租赁协议版本
-- ============================================

ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS agreement_id UUID;

-- 外键可选：若 agreements 表存在则添加
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agreements') THEN
    ALTER TABLE public.rentals
      DROP CONSTRAINT IF EXISTS fk_rentals_agreement;
    ALTER TABLE public.rentals
      ADD CONSTRAINT fk_rentals_agreement FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rentals_agreement_id ON public.rentals(agreement_id);
COMMENT ON COLUMN public.rentals.agreement_id IS '关联的租赁协议版本（agreements.type=rental）';
