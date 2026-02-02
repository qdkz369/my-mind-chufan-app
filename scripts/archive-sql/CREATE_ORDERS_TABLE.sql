-- ============================================
-- 创建 orders 表（订单/报修工单表）
-- ============================================

-- 如果表已存在，先删除（谨慎使用，生产环境请先备份数据）
-- DROP TABLE IF EXISTS orders CASCADE;

-- 创建 orders 表
CREATE TABLE IF NOT EXISTS public.orders (
  -- 主键
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 关联信息
  restaurant_id TEXT NOT NULL, -- 餐厅ID
  device_id TEXT, -- 设备ID（可选，用于报修）
  
  -- 服务信息
  service_type TEXT NOT NULL, -- 服务类型：维修服务、燃料配送、设备租赁等
  product_type TEXT, -- 产品类型（可选）
  status TEXT NOT NULL DEFAULT 'pending', -- 订单状态：pending, processing, completed, cancelled, active
  urgency TEXT, -- 紧急程度：low, medium, high（用于报修）
  
  -- 订单详情
  description TEXT, -- 问题描述或订单描述
  amount NUMERIC(10, 2) DEFAULT 0 NOT NULL, -- 金额
  customer_confirmed BOOLEAN DEFAULT false NOT NULL, -- 客户是否确认
  
  -- 工人/配送员信息
  worker_id TEXT, -- 工人ID（兼容旧字段）
  assigned_to TEXT, -- 指派的工人/配送员ID
  
  -- 媒体文件
  audio_url TEXT, -- 音频文件URL（用于报修语音）
  proof_image TEXT, -- 证明图片URL（用于配送/安装证明）
  
  -- 联系信息
  contact_phone TEXT, -- 联系电话
  
  -- 跟踪信息
  tracking_code TEXT, -- 跟踪码/订单号
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_service_type ON public.orders(service_type);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_worker_id ON public.orders(worker_id);

-- 创建更新时间触发器（自动更新 updated_at）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 如果触发器不存在，则创建
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE public.orders IS '订单/报修工单表，用于存储所有类型的订单（维修、配送、租赁等）';
COMMENT ON COLUMN public.orders.service_type IS '服务类型：维修服务、燃料配送、设备租赁等';
COMMENT ON COLUMN public.orders.status IS '订单状态：pending(待处理), processing(处理中), completed(已完成), cancelled(已取消), active(已激活)';
COMMENT ON COLUMN public.orders.urgency IS '紧急程度：low(低), medium(中), high(高)';
COMMENT ON COLUMN public.orders.audio_url IS '音频文件URL，用于报修语音消息';
COMMENT ON COLUMN public.orders.proof_image IS '证明图片URL，用于配送/安装证明';

