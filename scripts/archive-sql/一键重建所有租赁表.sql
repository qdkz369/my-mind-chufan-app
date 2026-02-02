-- ============================================
-- 一键重建所有设备租赁相关表
-- 包括：rental_orders 和 rentals
-- ============================================

-- ============================================
-- 第一部分：重建 rental_orders 表
-- ============================================

-- 1. 检查 rental_orders 表是否存在
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'rental_orders'
  ) THEN
    RAISE NOTICE 'rental_orders 表已存在，跳过创建';
  ELSE
    RAISE NOTICE 'rental_orders 表不存在，开始创建...';
  END IF;
END $$;

-- 2. 确保依赖表存在（equipment 和 equipment_categories）
-- 如果这些表不存在，请先运行 "创建设备相关表的完整脚本.sql"

-- 3. 检查 rental_orders 表是否存在且结构完整
DO $$
BEGIN
  -- 如果表存在但缺少 user_id 列，需要重建表
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'rental_orders'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'rental_orders' 
      AND column_name = 'user_id'
  ) THEN
    -- 表存在但结构不完整，删除后重建
    DROP TABLE IF EXISTS rental_orders CASCADE;
    RAISE NOTICE 'rental_orders 表结构不完整，已删除并准备重建';
  END IF;
END $$;

-- 4. 创建 rental_orders 表
CREATE TABLE IF NOT EXISTS rental_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  restaurant_id UUID NOT NULL,
  user_id UUID,
  equipment_id UUID,
  quantity INTEGER DEFAULT 1,
  rental_period INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rental_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'pending',
  order_status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  finance_api_order_id VARCHAR(100),
  finance_api_status VARCHAR(50),
  delivery_address TEXT,
  contact_phone VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 添加外键约束（如果 equipment 表存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'equipment'
  ) THEN
    -- 删除可能存在的旧外键
    ALTER TABLE rental_orders DROP CONSTRAINT IF EXISTS rental_orders_equipment_id_fkey;
    -- 添加外键约束
    ALTER TABLE rental_orders 
      ADD CONSTRAINT rental_orders_equipment_id_fkey 
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 6. 创建 rental_orders 索引（只在列存在时创建）
DO $$
BEGIN
  -- 检查并创建索引
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'rental_orders' 
      AND column_name = 'restaurant_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_rental_orders_restaurant ON rental_orders(restaurant_id);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'rental_orders' 
      AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_rental_orders_user ON rental_orders(user_id);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'rental_orders' 
      AND column_name = 'order_status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_rental_orders_status ON rental_orders(order_status);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'rental_orders' 
      AND column_name = 'equipment_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_rental_orders_equipment ON rental_orders(equipment_id);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'rental_orders' 
      AND column_name = 'order_number'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_rental_orders_order_number ON rental_orders(order_number);
  END IF;
END $$;

-- 7. 创建自动更新 updated_at 的触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建 rental_orders 触发器
DROP TRIGGER IF EXISTS update_rental_orders_updated_at ON rental_orders;
CREATE TRIGGER update_rental_orders_updated_at 
  BEFORE UPDATE ON rental_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. 启用 rental_orders 行级安全（RLS）
ALTER TABLE rental_orders ENABLE ROW LEVEL SECURITY;

-- 10. 删除 rental_orders 可能存在的旧策略
DROP POLICY IF EXISTS "Service role full access to rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can view all rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can insert rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can update rental orders" ON rental_orders;

-- 11. 创建 rental_orders RLS 策略
CREATE POLICY "Service role full access to rental orders"
  ON rental_orders FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view all rental orders"
  ON rental_orders FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert rental orders"
  ON rental_orders FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update rental orders"
  ON rental_orders FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================
-- 第二部分：重建 rentals 表
-- ============================================

-- 12. 检查 rentals 表是否存在
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'rentals'
  ) THEN
    RAISE NOTICE 'rentals 表已存在，跳过创建';
  ELSE
    RAISE NOTICE 'rentals 表不存在，开始创建...';
  END IF;
END $$;

-- 13. 创建 rentals 表
CREATE TABLE IF NOT EXISTS public.rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_sn TEXT NOT NULL,
  rent_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  deposit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending_delivery' CHECK (status IN ('pending_delivery', 'active', 'expired', 'returned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- 14. 创建 rentals 索引
CREATE INDEX IF NOT EXISTS idx_rentals_company_id ON public.rentals(company_id);
CREATE INDEX IF NOT EXISTS idx_rentals_customer_phone ON public.rentals(customer_phone);
CREATE INDEX IF NOT EXISTS idx_rentals_device_sn ON public.rentals(device_sn);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON public.rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_start_date ON public.rentals(start_date);
CREATE INDEX IF NOT EXISTS idx_rentals_end_date ON public.rentals(end_date);
CREATE INDEX IF NOT EXISTS idx_rentals_created_at ON public.rentals(created_at DESC);

-- 15. 创建 rentals 触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_rentals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 16. 创建 rentals 触发器
DROP TRIGGER IF EXISTS trigger_update_rentals_updated_at ON public.rentals;
CREATE TRIGGER trigger_update_rentals_updated_at
  BEFORE UPDATE ON public.rentals
  FOR EACH ROW
  EXECUTE FUNCTION update_rentals_updated_at();

-- 17. 启用 rentals 行级安全（RLS）
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- 18. 删除 rentals 可能存在的旧策略
DROP POLICY IF EXISTS "Service role full access to rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow authenticated users to view all rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow authenticated users to create rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow authenticated users to update rentals" ON public.rentals;
DROP POLICY IF EXISTS "Allow authenticated users to delete rentals" ON public.rentals;

-- 19. 创建 rentals RLS 策略
CREATE POLICY "Service role full access to rentals"
  ON public.rentals FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view all rentals"
  ON public.rentals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create rentals"
  ON public.rentals FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update rentals"
  ON public.rentals FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete rentals"
  ON public.rentals FOR DELETE TO authenticated
  USING (true);

-- ============================================
-- 第三部分：验证结果
-- ============================================

-- 20. 验证 rental_orders 表
SELECT 
  'rental_orders' AS 表名,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rental_orders')
    THEN '✅ 已创建'
    ELSE '❌ 创建失败'
  END AS 状态,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rental_orders') AS 字段数,
  (SELECT COUNT(*) FROM rental_orders) AS 记录数;

-- 21. 验证 rentals 表
SELECT 
  'rentals' AS 表名,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rentals')
    THEN '✅ 已创建'
    ELSE '❌ 创建失败'
  END AS 状态,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rentals') AS 字段数,
  (SELECT COUNT(*) FROM public.rentals) AS 记录数;

-- 22. 验证 RLS 策略
SELECT 
  tablename AS 表名,
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE
    WHEN roles = '{service_role}' THEN '✅ 服务角色'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户'
    ELSE roles::text
  END AS 角色
FROM pg_policies
WHERE tablename IN ('rental_orders', 'rentals')
ORDER BY tablename, policyname;

