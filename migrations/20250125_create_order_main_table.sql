-- ============================================
-- 创建 order_main 表（订单主表）
-- 用于统一管理燃料订单和租赁订单
-- ============================================

-- 1. 创建 order_main 表
CREATE TABLE IF NOT EXISTS order_main (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(100) NOT NULL UNIQUE,
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('fuel', 'rental')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 关联字段：指向具体业务订单表
  fuel_order_id UUID, -- 关联 delivery_orders 或 fuel_orders 表
  rental_order_id UUID REFERENCES rental_orders(id) ON DELETE SET NULL,
  
  -- 元数据
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  user_id UUID, -- 创建订单的用户ID
  notes TEXT,
  
  -- 索引
  CONSTRAINT order_main_order_type_check CHECK (order_type IN ('fuel', 'rental'))
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_order_main_order_number ON order_main(order_number);
CREATE INDEX IF NOT EXISTS idx_order_main_order_type ON order_main(order_type);
CREATE INDEX IF NOT EXISTS idx_order_main_company_id ON order_main(company_id);
CREATE INDEX IF NOT EXISTS idx_order_main_status ON order_main(status);
CREATE INDEX IF NOT EXISTS idx_order_main_created_at ON order_main(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_main_fuel_order_id ON order_main(fuel_order_id);
CREATE INDEX IF NOT EXISTS idx_order_main_rental_order_id ON order_main(rental_order_id);
CREATE INDEX IF NOT EXISTS idx_order_main_restaurant_id ON order_main(restaurant_id);

-- 3. 添加注释
COMMENT ON TABLE order_main IS '订单主表：统一管理燃料订单和租赁订单';
COMMENT ON COLUMN order_main.order_number IS '订单号（唯一）';
COMMENT ON COLUMN order_main.order_type IS '订单类型：fuel（燃料订单）或 rental（租赁订单）';
COMMENT ON COLUMN order_main.company_id IS '公司ID（用于多租户数据隔离）';
COMMENT ON COLUMN order_main.status IS '订单状态';
COMMENT ON COLUMN order_main.total_amount IS '订单总金额';
COMMENT ON COLUMN order_main.fuel_order_id IS '关联的燃料订单ID（delivery_orders 或 fuel_orders 表）';
COMMENT ON COLUMN order_main.rental_order_id IS '关联的租赁订单ID（rental_orders 表）';

-- 4. 启用 RLS
ALTER TABLE order_main ENABLE ROW LEVEL SECURITY;

-- 5. 删除旧策略（如果存在）
DROP POLICY IF EXISTS "order_main_company_isolation_select" ON order_main;
DROP POLICY IF EXISTS "order_main_company_isolation_insert" ON order_main;
DROP POLICY IF EXISTS "order_main_company_isolation_update" ON order_main;
DROP POLICY IF EXISTS "order_main_company_isolation_delete" ON order_main;
DROP POLICY IF EXISTS "Service role full access to order_main" ON order_main;

-- 6. 创建 RLS 策略：SELECT（查询）
CREATE POLICY "order_main_company_isolation_select"
ON order_main
FOR SELECT
TO authenticated
USING (
  -- 通过 restaurants 表查询用户的 company_id
  company_id IN (
    SELECT id -- restaurants.id 作为 company_id
    FROM restaurants
    WHERE user_id = auth.uid()
  )
  OR
  -- 平台通用订单（所有用户可访问）
  company_id IS NULL
);

-- 7. 创建 RLS 策略：INSERT（插入）
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

-- 8. 创建 RLS 策略：UPDATE（更新）
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

-- 9. 创建 RLS 策略：DELETE（删除）
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

-- 10. 服务角色完全访问策略（API 路由使用 serviceRoleKey 时绕过 RLS）
CREATE POLICY "Service role full access to order_main"
ON order_main
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 11. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_order_main_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_main_updated_at
BEFORE UPDATE ON order_main
FOR EACH ROW
EXECUTE FUNCTION update_order_main_updated_at();

-- 12. 验证表创建
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_main') THEN
    RAISE NOTICE '✅ order_main 表创建成功';
  ELSE
    RAISE EXCEPTION '❌ order_main 表创建失败';
  END IF;
END $$;
