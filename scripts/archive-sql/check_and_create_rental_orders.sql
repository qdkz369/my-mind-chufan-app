-- ============================================
-- 检查 rental_orders 表是否存在
-- ============================================

-- 方法1：查询表是否存在（推荐）
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'rental_orders'
) AS table_exists;

-- 如果返回 true，说明表已存在
-- 如果返回 false，说明表不存在，需要执行下面的创建脚本


-- ============================================
-- 如果表不存在，执行以下脚本创建 rental_orders 表
-- ============================================

-- 1. 首先确保 equipment 表存在（rental_orders 依赖它）
CREATE TABLE IF NOT EXISTS equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES equipment_categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  description TEXT,
  specifications JSONB,
  images TEXT[],
  monthly_rental_price DECIMAL(10, 2) NOT NULL,
  daily_rental_price DECIMAL(10, 2),
  deposit_amount DECIMAL(10, 2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  min_rental_period INTEGER DEFAULT 1,
  max_rental_period INTEGER,
  maintenance_included BOOLEAN DEFAULT true,
  delivery_included BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建 rental_orders 表
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

-- 3. 创建索引（提高查询速度）
CREATE INDEX IF NOT EXISTS idx_rental_orders_restaurant ON rental_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_user ON rental_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_status ON rental_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_rental_orders_equipment ON rental_orders(equipment_id);

-- 4. 创建自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rental_orders_updated_at 
  BEFORE UPDATE ON rental_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 启用行级安全（RLS）
ALTER TABLE rental_orders ENABLE ROW LEVEL SECURITY;

-- 6. 创建 RLS 策略（允许用户查看自己的订单）
DROP POLICY IF EXISTS "Users can view their own rental orders" ON rental_orders;
CREATE POLICY "Users can view their own rental orders"
  ON rental_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own rental orders" ON rental_orders;
CREATE POLICY "Users can create their own rental orders"
  ON rental_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own rental orders" ON rental_orders;
CREATE POLICY "Users can update their own rental orders"
  ON rental_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. 验证表是否创建成功
SELECT 
  'rental_orders 表创建成功！' AS message,
  COUNT(*) AS column_count
FROM information_schema.columns 
WHERE table_name = 'rental_orders';


