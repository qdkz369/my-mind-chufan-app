-- ============================================
-- 发票表优化：新增 company_id、remark 字段
-- 基于建议方案补充，适用于已存在的 invoices 表
-- ============================================

-- 1. 新增 company_id：所属供应商/公司，便于多租户筛选与统计
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
COMMENT ON COLUMN invoices.company_id IS '所属公司/供应商（可从 order_main 或 restaurant 冗余）';
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);

-- 2. 新增 remark：驳回原因或备注
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS remark TEXT;
COMMENT ON COLUMN invoices.remark IS '备注或驳回原因';
