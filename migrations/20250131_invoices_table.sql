-- ============================================
-- 创建 invoices 表（发票申请/记录）
-- 创建日期: 2026-01-31
-- 说明: 用户对已完成订单申请开票，记录开票信息与状态
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_main_id UUID NOT NULL REFERENCES order_main(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  
  -- 开票信息
  invoice_type VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (invoice_type IN ('normal', 'special')),
  title_type VARCHAR(20) NOT NULL DEFAULT 'enterprise' CHECK (title_type IN ('personal', 'enterprise')),
  company_name VARCHAR(200) NOT NULL,
  tax_id VARCHAR(50),
  address TEXT,
  phone VARCHAR(50),
  bank_name VARCHAR(200),
  bank_account VARCHAR(100),
  email VARCHAR(100),
  
  -- 金额（冗余存储，便于展示）
  amount NUMERIC(12, 2) NOT NULL,
  
  -- 状态与发票号
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'issued', 'rejected')),
  invoice_number VARCHAR(50),
  issued_at TIMESTAMPTZ,
  
  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_restaurant_id ON invoices(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_main_id ON invoices(order_main_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

COMMENT ON TABLE invoices IS '发票申请/记录表';
COMMENT ON COLUMN invoices.invoice_type IS '发票类型：normal-增值税普通发票，special-增值税专用发票';
COMMENT ON COLUMN invoices.title_type IS '抬头类型：personal-个人，enterprise-企业';
COMMENT ON COLUMN invoices.status IS '状态：pending-待处理，processing-开票中，issued-已开票，rejected-已拒绝';

-- 同一订单只能申请一次发票
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_order_main_unique ON invoices(order_main_id);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_invoices_updated_at();

-- RLS：允许通过 restaurant_id 访问（客户端用户通过 x-restaurant-id 认证后由 API 使用 service role 查询）
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 服务角色完全访问
DROP POLICY IF EXISTS "Service role full access to invoices" ON invoices;
CREATE POLICY "Service role full access to invoices"
ON invoices FOR ALL TO service_role
USING (true) WITH CHECK (true);
