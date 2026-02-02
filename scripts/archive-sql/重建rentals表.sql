-- ============================================
-- 重建 rentals 表（租赁管理表）
-- 注意：此脚本会安全地创建表，不会覆盖现有数据
-- ============================================

-- 1. 首先检查表是否存在
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'rentals'
  ) THEN
    RAISE NOTICE 'rentals 表已存在，跳过创建';
  ELSE
    RAISE NOTICE 'rentals 表不存在，开始创建...';
  END IF;
END $$;

-- 2. 创建 rentals 表
CREATE TABLE IF NOT EXISTS public.rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 服务商公司ID（为生态圈做准备）
  company_id UUID,
  
  -- 承租人信息
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
  -- 设备信息
  device_name TEXT NOT NULL,
  device_sn TEXT NOT NULL, -- 设备唯一序列号
  
  -- 租金信息
  rent_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- 月租金
  deposit DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- 押金金额
  
  -- 租期信息
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- 状态：待交付、租赁中、已到期、已收回
  status TEXT NOT NULL DEFAULT 'pending_delivery' CHECK (status IN ('pending_delivery', 'active', 'expired', 'returned')),
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 备注信息
  notes TEXT
);

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_rentals_company_id ON public.rentals(company_id);
CREATE INDEX IF NOT EXISTS idx_rentals_customer_phone ON public.rentals(customer_phone);
CREATE INDEX IF NOT EXISTS idx_rentals_device_sn ON public.rentals(device_sn);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON public.rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_start_date ON public.rentals(start_date);
CREATE INDEX IF NOT EXISTS idx_rentals_end_date ON public.rentals(end_date);
CREATE INDEX IF NOT EXISTS idx_rentals_created_at ON public.rentals(created_at DESC);

-- 4. 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_rentals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建触发器
DROP TRIGGER IF EXISTS trigger_update_rentals_updated_at ON public.rentals;
CREATE TRIGGER trigger_update_rentals_updated_at
  BEFORE UPDATE ON public.rentals
  FOR EACH ROW
  EXECUTE FUNCTION update_rentals_updated_at();

-- 6. 启用行级安全（RLS）
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- 7. 删除可能存在的旧策略（避免冲突）
DROP POLICY IF EXISTS "Allow authenticated users to view all rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow authenticated users to create rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow authenticated users to update rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow authenticated users to delete rentals" ON public.rentals;
DROP POLICY IF EXISTS "Service role full access to rentals" ON public.rentals;

-- 8. 创建 RLS 策略（服务角色完全访问 - 最重要！）
CREATE POLICY "Service role full access to rentals"
  ON public.rentals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 9. 创建 RLS 策略（认证用户查看所有租赁记录）
CREATE POLICY "Allow authenticated users to view all rentals"
  ON public.rentals
  FOR SELECT
  TO authenticated
  USING (true);

-- 10. 创建 RLS 策略（认证用户创建租赁记录）
CREATE POLICY "Allow authenticated users to create rentals"
  ON public.rentals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 11. 创建 RLS 策略（认证用户更新租赁记录）
CREATE POLICY "Allow authenticated users to update rentals"
  ON public.rentals
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 12. 创建 RLS 策略（认证用户删除租赁记录）
CREATE POLICY "Allow authenticated users to delete rentals"
  ON public.rentals
  FOR DELETE
  TO authenticated
  USING (true);

-- 13. 添加表注释
COMMENT ON TABLE public.rentals IS '租赁管理表：记录设备租赁信息';
COMMENT ON COLUMN public.rentals.id IS '唯一标识符';
COMMENT ON COLUMN public.rentals.company_id IS '服务商公司ID（为生态圈做准备）';
COMMENT ON COLUMN public.rentals.customer_name IS '承租人姓名';
COMMENT ON COLUMN public.rentals.customer_phone IS '承租人电话';
COMMENT ON COLUMN public.rentals.device_name IS '设备名称';
COMMENT ON COLUMN public.rentals.device_sn IS '设备唯一序列号';
COMMENT ON COLUMN public.rentals.rent_amount IS '月租金（元）';
COMMENT ON COLUMN public.rentals.deposit IS '押金金额（元）';
COMMENT ON COLUMN public.rentals.start_date IS '租期开始日期';
COMMENT ON COLUMN public.rentals.end_date IS '租期结束日期（NULL表示未设置）';
COMMENT ON COLUMN public.rentals.status IS '状态：pending_delivery(待交付)、active(租赁中)、expired(已到期)、returned(已收回)';
COMMENT ON COLUMN public.rentals.notes IS '备注信息';

-- 14. 验证表是否创建成功
SELECT 
  '✅ rentals 表创建成功！' AS 消息,
  COUNT(*) AS 字段数量,
  (SELECT COUNT(*) FROM public.rentals) AS 现有记录数
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'rentals';

-- 15. 验证 RLS 策略
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE
    WHEN roles = '{service_role}' THEN '✅ 服务角色（API使用）'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户（前端使用）'
    ELSE roles::text
  END AS 角色说明
FROM pg_policies
WHERE tablename = 'rentals'
ORDER BY policyname;


