-- ============================================
-- 通知管理表创建脚本（简化版 - 仅必要字段）
-- 创建日期: 2025-01-21
-- 说明: 用于管理客户端通知消息
-- ============================================

-- 创建 notifications 表（如果不存在）
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id TEXT NOT NULL,                    -- 餐厅ID（使用 TEXT 兼容 UUID 和 TEXT 格式）
  title VARCHAR(200) NOT NULL,                    -- 通知标题
  content TEXT NOT NULL,                          -- 通知内容
  is_read BOOLEAN NOT NULL DEFAULT false,         -- 是否已读，默认为 false
  created_at TIMESTAMPTZ DEFAULT NOW()           -- 创建时间
);

-- 创建索引（提高查询性能）
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_id ON notifications(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 添加注释
COMMENT ON TABLE notifications IS '通知管理表，用于存储客户端通知消息';
COMMENT ON COLUMN notifications.restaurant_id IS '餐厅ID（TEXT类型，兼容UUID和TEXT格式）';
COMMENT ON COLUMN notifications.is_read IS '是否已读，用于显示未读数量';
