-- ============================================
-- 创建 workers 表的完整 SQL 脚本
-- 请完整复制此文件的所有内容到 Supabase SQL Editor 执行
-- ============================================

-- 步骤1: 如果表已存在，先删除（可选，如果表不存在会报错但可以忽略）
DROP TABLE IF EXISTS public.workers CASCADE;

-- 步骤2: 创建 workers 表
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

-- 步骤3: 创建索引（提升查询性能）
CREATE INDEX idx_workers_phone ON public.workers(phone);
CREATE INDEX idx_workers_status ON public.workers(status);
CREATE INDEX idx_workers_worker_type ON public.workers(worker_type);

-- 步骤4: 禁用 RLS（Row Level Security）- 确保可以正常操作
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;

-- 步骤5: 验证表是否创建成功（可选，用于测试）
-- SELECT * FROM public.workers LIMIT 1;

-- ============================================
-- 执行说明：
-- 1. 打开 Supabase Dashboard: https://app.supabase.com
-- 2. 选择你的项目
-- 3. 点击左侧菜单 "SQL Editor"
-- 4. 点击 "New query"
-- 5. 复制上面的所有 SQL 代码（从 DROP TABLE 开始到 DISABLE ROW LEVEL SECURITY 结束）
-- 6. 粘贴到 SQL Editor
-- 7. 点击 "Run" 按钮或按 Ctrl+Enter
-- 8. 等待执行完成，应该显示 "Success"
-- 9. 刷新管理端页面，再次尝试添加工人
-- ============================================

