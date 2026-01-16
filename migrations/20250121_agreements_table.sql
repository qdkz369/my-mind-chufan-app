-- ============================================
-- 协议管理表创建脚本
-- 创建日期: 2025-01-21
-- 说明: 用于管理服务协议、支付协议等各类协议内容
-- ============================================

-- 创建 agreements 表
CREATE TABLE IF NOT EXISTS agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 协议基本信息
  title VARCHAR(200) NOT NULL,                    -- 协议标题（如"服务协议"、"支付协议"）
  type VARCHAR(50) NOT NULL,                      -- 协议类型：service（服务协议）、payment（支付协议）、privacy（隐私协议）、terms（使用条款）等
  version VARCHAR(20) NOT NULL DEFAULT '1.0',     -- 协议版本号
  
  -- 协议内容
  content TEXT NOT NULL,                          -- 协议正文内容（支持Markdown格式）
  content_html TEXT,                              -- 协议HTML内容（可选，用于富文本显示）
  
  -- 状态管理
  status VARCHAR(20) NOT NULL DEFAULT 'draft',    -- 状态：draft（草稿）、published（已发布）、archived（已归档）
  is_active BOOLEAN NOT NULL DEFAULT false,       -- 是否为当前生效版本（同一类型只能有一个active版本）
  
  -- 元数据
  effective_date DATE,                            -- 生效日期
  expiry_date DATE,                               -- 失效日期（可选）
  description TEXT,                               -- 协议描述/说明
  
  -- 审核信息
  approved_by UUID,                               -- 审核人ID（关联users表）
  approved_at TIMESTAMPTZ,                        -- 审核时间
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,                                -- 创建人ID（关联users表）
  updated_by UUID                                 -- 最后更新人ID（关联users表）
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_agreements_type ON agreements(type);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_is_active ON agreements(is_active);
CREATE INDEX IF NOT EXISTS idx_agreements_type_active ON agreements(type, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agreements_created_at ON agreements(created_at DESC);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_agreements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agreements_updated_at_trigger
BEFORE UPDATE ON agreements
FOR EACH ROW
EXECUTE FUNCTION update_agreements_updated_at();

-- 添加约束：确保同一类型只能有一个active版本
CREATE UNIQUE INDEX IF NOT EXISTS idx_agreements_unique_active_type 
ON agreements(type) 
WHERE is_active = true AND status = 'published';

-- 添加注释
COMMENT ON TABLE agreements IS '协议管理表，用于存储各类协议内容（服务协议、支付协议等）';
COMMENT ON COLUMN agreements.type IS '协议类型：service（服务协议）、payment（支付协议）、privacy（隐私协议）、terms（使用条款）';
COMMENT ON COLUMN agreements.is_active IS '是否为当前生效版本，同一类型只能有一个active版本';
COMMENT ON COLUMN agreements.content IS '协议正文内容，支持Markdown格式';
COMMENT ON COLUMN agreements.content_html IS '协议HTML内容，可选，用于富文本显示';
