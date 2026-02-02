-- ============================================
-- 重建 rental_orders 表（设备租赁订单表）
-- 注意：此脚本会安全地创建表，不会覆盖现有数据
-- ============================================

-- 1. 首先检查表是否存在
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

-- 3. 创建 rental_orders 表
CREATE TABLE IF NOT EXISTS rental_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  restaurant_id UUID NOT NULL,
  user_id UUID,
  equipment_id UUID REFERENCES equipment(id) ON DELETE RESTRICT,
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

-- 4. 创建索引（提高查询速度）
CREATE INDEX IF NOT EXISTS idx_rental_orders_restaurant ON rental_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_user ON rental_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_status ON rental_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_rental_orders_equipment ON rental_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_order_number ON rental_orders(order_number);

-- 5. 创建自动更新 updated_at 的触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建触发器
DROP TRIGGER IF EXISTS update_rental_orders_updated_at ON rental_orders;
CREATE TRIGGER update_rental_orders_updated_at 
  BEFORE UPDATE ON rental_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. 启用行级安全（RLS）
ALTER TABLE rental_orders ENABLE ROW LEVEL SECURITY;

-- 8. 删除可能存在的旧策略（避免冲突）
DROP POLICY IF EXISTS "Service role full access to rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can view all rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can insert rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Authenticated users can update rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Users can view their own rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Users can create their own rental orders" ON rental_orders;
DROP POLICY IF EXISTS "Users can update their own rental orders" ON rental_orders;

-- 9. 创建 RLS 策略（服务角色完全访问 - 最重要！）
CREATE POLICY "Service role full access to rental orders"
  ON rental_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 10. 创建 RLS 策略（认证用户查看所有订单 - 用于管理端）
CREATE POLICY "Authenticated users can view all rental orders"
  ON rental_orders
  FOR SELECT
  TO authenticated
  USING (true);

-- 11. 创建 RLS 策略（认证用户插入订单）
CREATE POLICY "Authenticated users can insert rental orders"
  ON rental_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 12. 创建 RLS 策略（认证用户更新订单）
CREATE POLICY "Authenticated users can update rental orders"
  ON rental_orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 13. 验证表是否创建成功
SELECT 
  '✅ rental_orders 表创建成功！' AS 消息,
  COUNT(*) AS 字段数量,
  (SELECT COUNT(*) FROM rental_orders) AS 现有记录数
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'rental_orders';

-- 14. 验证 RLS 策略
SELECT 
  policyname AS 策略名称,
  cmd AS 操作类型,
  CASE
    WHEN roles = '{service_role}' THEN '✅ 服务角色（API使用）'
    WHEN roles = '{authenticated}' THEN '✅ 认证用户（前端使用）'
    ELSE roles::text
  END AS 角色说明
FROM pg_policies
WHERE tablename = 'rental_orders'
ORDER BY policyname;


