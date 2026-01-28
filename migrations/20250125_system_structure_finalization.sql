-- ============================================
-- 全系统结构定型与字段补全
-- 1. 字段对齐：为业务表添加 company_id 字段
-- 2. RLS 复制：为业务表启用 RLS 策略
-- ============================================

-- ============================================
-- 第一步：确保 restaurants 表有必要的字段
-- ============================================

-- 为 restaurants 表添加 user_id 字段（如果不存在）
-- 用于关联餐厅和用户
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS user_id UUID;

-- 为 restaurants 表添加 company_id 字段（如果不存在）
-- 用于多租户数据隔离
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_restaurants_user_id ON restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_company_id ON restaurants(company_id);

-- ============================================
-- 第二步：为业务表添加 company_id 字段
-- ============================================

-- 1. rental_orders 表
-- 检查是否已有 provider_id 字段（如果已有，可以保留；如果没有，添加 company_id）
DO $$
BEGIN
  -- 如果 rental_orders 表存在但没有 company_id 字段，则添加
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'rental_orders'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_orders' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE rental_orders
    ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
    
    -- 如果已有 provider_id，将数据复制到 company_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'rental_orders' 
      AND column_name = 'provider_id'
    ) THEN
      UPDATE rental_orders
      SET company_id = provider_id
      WHERE company_id IS NULL AND provider_id IS NOT NULL;
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_rental_orders_company_id ON rental_orders(company_id);
  END IF;
END $$;

-- 2. fuel_orders 表
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'fuel_orders'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'fuel_orders' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE fuel_orders
    ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_fuel_orders_company_id ON fuel_orders(company_id);
  END IF;
END $$;

-- 3. order_main 表
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_main'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_main' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE order_main
    ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_order_main_company_id ON order_main(company_id);
  END IF;
END $$;

-- 4. worker_tasks 表
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'worker_tasks'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'worker_tasks' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE worker_tasks
    ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_worker_tasks_company_id ON worker_tasks(company_id);
  END IF;
END $$;

-- ============================================
-- 第三步：启用 RLS 并创建策略
-- ============================================

-- 1. rental_orders 表 RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'rental_orders'
  ) THEN
    ALTER TABLE rental_orders ENABLE ROW LEVEL SECURITY;
    
    -- 删除旧策略
    DROP POLICY IF EXISTS "rental_orders_company_isolation_select" ON rental_orders;
    DROP POLICY IF EXISTS "rental_orders_company_isolation_insert" ON rental_orders;
    DROP POLICY IF EXISTS "rental_orders_company_isolation_update" ON rental_orders;
    DROP POLICY IF EXISTS "rental_orders_company_isolation_delete" ON rental_orders;
    
    -- SELECT 策略
    CREATE POLICY "rental_orders_company_isolation_select"
    ON rental_orders
    FOR SELECT
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    -- INSERT 策略
    CREATE POLICY "rental_orders_company_isolation_insert"
    ON rental_orders
    FOR INSERT
    TO authenticated
    WITH CHECK (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    -- UPDATE 策略
    CREATE POLICY "rental_orders_company_isolation_update"
    ON rental_orders
    FOR UPDATE
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    -- DELETE 策略
    CREATE POLICY "rental_orders_company_isolation_delete"
    ON rental_orders
    FOR DELETE
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    -- 服务角色完全访问
    DROP POLICY IF EXISTS "Service role full access to rental_orders" ON rental_orders;
    CREATE POLICY "Service role full access to rental_orders"
      ON rental_orders
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 2. fuel_orders 表 RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'fuel_orders'
  ) THEN
    ALTER TABLE fuel_orders ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "fuel_orders_company_isolation_select" ON fuel_orders;
    DROP POLICY IF EXISTS "fuel_orders_company_isolation_insert" ON fuel_orders;
    DROP POLICY IF EXISTS "fuel_orders_company_isolation_update" ON fuel_orders;
    DROP POLICY IF EXISTS "fuel_orders_company_isolation_delete" ON fuel_orders;
    
    CREATE POLICY "fuel_orders_company_isolation_select"
    ON fuel_orders
    FOR SELECT
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    CREATE POLICY "fuel_orders_company_isolation_insert"
    ON fuel_orders
    FOR INSERT
    TO authenticated
    WITH CHECK (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    CREATE POLICY "fuel_orders_company_isolation_update"
    ON fuel_orders
    FOR UPDATE
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    CREATE POLICY "fuel_orders_company_isolation_delete"
    ON fuel_orders
    FOR DELETE
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    DROP POLICY IF EXISTS "Service role full access to fuel_orders" ON fuel_orders;
    CREATE POLICY "Service role full access to fuel_orders"
      ON fuel_orders
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 3. order_main 表 RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_main'
  ) THEN
    ALTER TABLE order_main ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "order_main_company_isolation_select" ON order_main;
    DROP POLICY IF EXISTS "order_main_company_isolation_insert" ON order_main;
    DROP POLICY IF EXISTS "order_main_company_isolation_update" ON order_main;
    DROP POLICY IF EXISTS "order_main_company_isolation_delete" ON order_main;
    
    CREATE POLICY "order_main_company_isolation_select"
    ON order_main
    FOR SELECT
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    CREATE POLICY "order_main_company_isolation_insert"
    ON order_main
    FOR INSERT
    TO authenticated
    WITH CHECK (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    CREATE POLICY "order_main_company_isolation_update"
    ON order_main
    FOR UPDATE
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    CREATE POLICY "order_main_company_isolation_delete"
    ON order_main
    FOR DELETE
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    DROP POLICY IF EXISTS "Service role full access to order_main" ON order_main;
    CREATE POLICY "Service role full access to order_main"
      ON order_main
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 4. worker_tasks 表 RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'worker_tasks'
  ) THEN
    ALTER TABLE worker_tasks ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "worker_tasks_company_isolation_select" ON worker_tasks;
    DROP POLICY IF EXISTS "worker_tasks_company_isolation_insert" ON worker_tasks;
    DROP POLICY IF EXISTS "worker_tasks_company_isolation_update" ON worker_tasks;
    DROP POLICY IF EXISTS "worker_tasks_company_isolation_delete" ON worker_tasks;
    
    CREATE POLICY "worker_tasks_company_isolation_select"
    ON worker_tasks
    FOR SELECT
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    CREATE POLICY "worker_tasks_company_isolation_insert"
    ON worker_tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    CREATE POLICY "worker_tasks_company_isolation_update"
    ON worker_tasks
    FOR UPDATE
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    CREATE POLICY "worker_tasks_company_isolation_delete"
    ON worker_tasks
    FOR DELETE
    TO authenticated
    USING (
      company_id IN (
        SELECT company_id 
        FROM restaurants 
        WHERE user_id = auth.uid()
      )
      OR
      company_id IS NULL
    );
    
    DROP POLICY IF EXISTS "Service role full access to worker_tasks" ON worker_tasks;
    CREATE POLICY "Service role full access to worker_tasks"
      ON worker_tasks
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 第四步：验证
-- ============================================

-- 检查表是否存在以及字段是否添加成功
SELECT
  t.table_name AS 表名,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name 
      AND column_name = 'company_id'
    )
    THEN '✅ 有 company_id'
    ELSE '❌ 无 company_id'
  END AS company_id状态,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = t.table_name
    ) AND (
      SELECT rowsecurity FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = t.table_name
    )
    THEN '✅ RLS已启用'
    ELSE '❌ RLS未启用'
  END AS RLS状态
FROM (
  SELECT unnest(ARRAY[
    'rental_orders',
    'fuel_orders',
    'order_main',
    'worker_tasks'
  ]) AS table_name
) t
ORDER BY table_name;

-- 检查 RLS 策略
SELECT
  tablename AS 表名,
  policyname AS 策略名称,
  cmd AS 操作类型
FROM pg_policies
WHERE tablename IN ('rental_orders', 'fuel_orders', 'order_main', 'worker_tasks')
ORDER BY tablename, policyname;
