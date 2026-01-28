-- ============================================
-- 为 agreements 表添加 company_id 字段以支持供应商数据隔离
-- 创建日期: 2025-01-25
-- 说明: 实现协议数据的多租户隔离，制造厂只能看到自己相关的协议，金融方只能看到资金相关的协议
-- ============================================

-- 添加 company_id 字段
ALTER TABLE agreements 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_agreements_company_id ON agreements(company_id);

-- 创建复合索引（用于按公司和类型查询）
CREATE INDEX IF NOT EXISTS idx_agreements_company_type ON agreements(company_id, type);

-- 创建复合索引（用于按公司、类型和状态查询）
CREATE INDEX IF NOT EXISTS idx_agreements_company_type_status ON agreements(company_id, type, status);

-- 更新唯一索引约束，考虑 company_id（同一公司、同一类型只能有一个active版本）
DROP INDEX IF EXISTS idx_agreements_unique_active_type;
CREATE UNIQUE INDEX IF NOT EXISTS idx_agreements_unique_active_type 
ON agreements(company_id, type) 
WHERE is_active = true AND status = 'published';

-- 添加注释
COMMENT ON COLUMN agreements.company_id IS '公司ID（用于多租户数据隔离），NULL 表示平台通用协议';
