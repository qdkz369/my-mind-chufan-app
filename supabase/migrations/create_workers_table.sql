-- 创建 workers 表
CREATE TABLE IF NOT EXISTS public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  worker_type TEXT, -- 'delivery', 'repair', 'install' 或 JSON 数组
  product_types JSONB DEFAULT '[]'::jsonb, -- 产品类型数组，仅配送员使用
  status TEXT DEFAULT 'active', -- 'active' 或 'inactive'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_workers_phone ON public.workers(phone);
CREATE INDEX IF NOT EXISTS idx_workers_status ON public.workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_worker_type ON public.workers(worker_type);

-- 添加注释
COMMENT ON TABLE public.workers IS '工人信息表';
COMMENT ON COLUMN public.workers.id IS '工人ID';
COMMENT ON COLUMN public.workers.name IS '工人姓名';
COMMENT ON COLUMN public.workers.phone IS '联系电话';
COMMENT ON COLUMN public.workers.worker_type IS '工人类型：delivery(配送员), repair(维修工), install(安装工)，或JSON数组支持多类型';
COMMENT ON COLUMN public.workers.product_types IS '产品类型数组（仅配送员）：lpg, clean, alcohol, outdoor';
COMMENT ON COLUMN public.workers.status IS '状态：active(在职), inactive(离职)';
COMMENT ON COLUMN public.workers.created_at IS '创建时间';
COMMENT ON COLUMN public.workers.updated_at IS '更新时间';

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 启用 Row Level Security (可选)
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有操作（根据实际需求调整）
CREATE POLICY "Allow all operations on workers" ON public.workers
  FOR ALL
  USING (true)
  WITH CHECK (true);

