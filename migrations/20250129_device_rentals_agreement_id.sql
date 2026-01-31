-- ============================================
-- device_rentals 表关联租赁协议（agreement_id）
-- 执行日期：2025-01-29
-- 说明：客户在客户端确认租赁时记录其同意的协议版本
-- ============================================

ALTER TABLE public.device_rentals
  ADD COLUMN IF NOT EXISTS agreement_id UUID;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agreements') THEN
    ALTER TABLE public.device_rentals
      DROP CONSTRAINT IF EXISTS fk_device_rentals_agreement;
    ALTER TABLE public.device_rentals
      ADD CONSTRAINT fk_device_rentals_agreement FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_device_rentals_agreement_id ON public.device_rentals(agreement_id);
COMMENT ON COLUMN public.device_rentals.agreement_id IS '客户确认租赁时同意的协议版本（agreements.type=rental）';
