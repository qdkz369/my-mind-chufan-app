-- ============================================
-- 通知管理表创建脚本
-- 创建日期: 2025-01-21
-- 说明: 用于管理客户端通知消息（订单通知、系统通知等）
-- ============================================

-- 创建 notifications 表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 接收者信息
  restaurant_id UUID NOT NULL,                    -- 餐厅ID（接收通知的餐厅）
  user_id UUID,                                    -- 用户ID（可选，如果指定用户）
  
  -- 通知基本信息
  title VARCHAR(200) NOT NULL,                     -- 通知标题
  content TEXT NOT NULL,                           -- 通知内容
  type VARCHAR(50) NOT NULL,                      -- 通知类型：order（订单）、system（系统）、alert（提醒）、announcement（公告）
  category VARCHAR(50),                            -- 通知分类：order_created（订单创建）、order_status（订单状态）、delivery（配送）、repair（报修）、admin_message（管理端消息）等
  
  -- 关联信息
  related_order_id UUID,                           -- 关联订单ID（如果是订单通知）
  related_entity_type VARCHAR(50),                 -- 关联实体类型：delivery_order、repair_order、rental_order等
  related_entity_id UUID,                          -- 关联实体ID
  
  -- 状态管理
  is_read BOOLEAN NOT NULL DEFAULT false,          -- 是否已读
  read_at TIMESTAMPTZ,                             -- 阅读时间
  
  -- 优先级
  priority VARCHAR(20) DEFAULT 'normal',           -- 优先级：low、normal、high、urgent
  
  -- 操作链接
  action_url TEXT,                                 -- 点击通知后的跳转链接
  action_label VARCHAR(100),                       -- 操作按钮文字
  
  -- 发送者信息（如果是管理端发送）
  sender_type VARCHAR(50),                         -- 发送者类型：system（系统）、admin（管理员）、worker（工人）
  sender_id UUID,                                  -- 发送者ID（如果是管理员或工人）
  sender_name VARCHAR(100),                        -- 发送者名称
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ                           -- 过期时间（可选）
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_id ON notifications(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_unread ON notifications(restaurant_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_related_order ON notifications(related_order_id) WHERE related_order_id IS NOT NULL;

-- 创建更新时间触发器（如果需要）
-- 注意：此表不需要 updated_at，因为通知创建后通常不修改

-- 添加注释
COMMENT ON TABLE notifications IS '通知管理表，用于存储客户端通知消息';
COMMENT ON COLUMN notifications.type IS '通知类型：order（订单）、system（系统）、alert（提醒）、announcement（公告）';
COMMENT ON COLUMN notifications.category IS '通知分类：order_created、order_status、delivery、repair、admin_message等';
COMMENT ON COLUMN notifications.is_read IS '是否已读，用于显示未读数量';
