-- ============================================
-- 租赁管理表 (rentals) 创建脚本
-- 安全创建：使用 IF NOT EXISTS 确保不会覆盖现有表
-- ============================================

-- 创建 rentals 表（如果不存在）
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
  notes TEXT,
  
  -- 外键约束（如果 company_id 需要关联到其他表）
  -- CONSTRAINT fk_rentals_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_rentals_company_id ON public.rentals(company_id);
CREATE INDEX IF NOT EXISTS idx_rentals_customer_phone ON public.rentals(customer_phone);
CREATE INDEX IF NOT EXISTS idx_rentals_device_sn ON public.rentals(device_sn);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON public.rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_start_date ON public.rentals(start_date);
CREATE INDEX IF NOT EXISTS idx_rentals_end_date ON public.rentals(end_date);
CREATE INDEX IF NOT EXISTS idx_rentals_created_at ON public.rentals(created_at DESC);

-- 创建更新时间触发器（自动更新 updated_at 字段）
CREATE OR REPLACE FUNCTION update_rentals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 如果触发器不存在则创建
DROP TRIGGER IF EXISTS trigger_update_rentals_updated_at ON public.rentals;
CREATE TRIGGER trigger_update_rentals_updated_at
  BEFORE UPDATE ON public.rentals
  FOR EACH ROW
  EXECUTE FUNCTION update_rentals_updated_at();

-- ============================================
-- Row Level Security (RLS) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- 策略1：允许认证用户查看所有租赁记录（管理员）
CREATE POLICY "Allow authenticated users to view all rentals"
  ON public.rentals
  FOR SELECT
  TO authenticated
  USING (true);

-- 策略2：允许认证用户创建租赁记录
CREATE POLICY "Allow authenticated users to create rentals"
  ON public.rentals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 策略3：允许认证用户更新租赁记录
CREATE POLICY "Allow authenticated users to update rentals"
  ON public.rentals
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 策略4：允许认证用户删除租赁记录
CREATE POLICY "Allow authenticated users to delete rentals"
  ON public.rentals
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 注释说明
-- ============================================

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

-- ============================================
-- 验证脚本（可选，用于检查表是否创建成功）
-- ============================================

-- 取消注释以下行来验证表结构
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'rentals'
-- ORDER BY ordinal_position;

