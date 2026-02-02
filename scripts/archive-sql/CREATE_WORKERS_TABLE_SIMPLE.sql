-- 简化版：创建 workers 表
-- 请在 Supabase Dashboard 的 SQL Editor 中执行

-- 如果表已存在，先删除（可选，如果表不存在会报错但可以忽略）
-- DROP TABLE IF EXISTS public.workers CASCADE;

-- 创建 workers 表（最简版本）
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  worker_type TEXT,
  product_types JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_workers_phone ON public.workers(phone);
CREATE INDEX idx_workers_status ON public.workers(status);

-- 禁用 RLS（先禁用，确保可以正常操作）
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;

-- 或者启用RLS并创建允许所有操作的策略
-- ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all operations for workers" ON public.workers FOR ALL USING (true) WITH CHECK (true);

