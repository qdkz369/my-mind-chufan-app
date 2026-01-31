-- ============================================
-- 对公支付相关表结构扩展
-- 创建日期: 2026-01-31
-- 说明: companies 收款账户、restaurants 授信额度、delivery_orders 对公字段
-- ============================================

-- 1. companies 表：供应商/合伙人对公收款账户（多租户白标化）
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_id TEXT;

COMMENT ON COLUMN companies.bank_name IS '开户行名称';
COMMENT ON COLUMN companies.bank_account IS '银行账号';
COMMENT ON COLUMN companies.tax_id IS '纳税人识别号';

-- 2. restaurants 表：企业客户授信额度
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS credit_line DECIMAL(12,2) DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'individual';

COMMENT ON COLUMN restaurants.credit_line IS '授信额度（元），0表示不授信';
COMMENT ON COLUMN restaurants.customer_type IS 'individual|enterprise';

-- 3. delivery_orders 表：对公支付相关字段
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'online';
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS invoice_requested BOOLEAN DEFAULT false;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS corporate_company_name TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS corporate_tax_id TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS payment_voucher_url TEXT;

COMMENT ON COLUMN delivery_orders.payment_method IS 'online|corporate';
COMMENT ON COLUMN delivery_orders.payment_status IS 'pending|paid|pending_transfer|transfer_confirmed';
COMMENT ON COLUMN delivery_orders.invoice_requested IS '是否需要发票';
COMMENT ON COLUMN delivery_orders.corporate_company_name IS '对公：客户公司名称';
COMMENT ON COLUMN delivery_orders.corporate_tax_id IS '对公：客户纳税人识别号';
COMMENT ON COLUMN delivery_orders.payment_voucher_url IS '对公：转账凭证图片URL';

-- 4. 索引（便于筛单）
CREATE INDEX IF NOT EXISTS idx_delivery_orders_payment_method ON delivery_orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_payment_status ON delivery_orders(payment_status);
