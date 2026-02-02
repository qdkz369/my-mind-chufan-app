-- ============================================
-- 设备租赁系统数据库结构
-- ============================================

-- 1. 设备分类表
CREATE TABLE IF NOT EXISTS equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE, -- 分类名称：如"炉灶设备"、"制冷设备"等
  description TEXT, -- 分类描述
  icon VARCHAR(50), -- 图标名称（lucide-react）
  sort_order INTEGER DEFAULT 0, -- 排序
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 设备表
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES equipment_categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL, -- 设备名称
  brand VARCHAR(100), -- 品牌
  model VARCHAR(100), -- 型号
  description TEXT, -- 设备描述
  specifications JSONB, -- 规格参数（JSON格式）
  images TEXT[], -- 图片URL数组
  monthly_rental_price DECIMAL(10, 2) NOT NULL, -- 月租金
  daily_rental_price DECIMAL(10, 2), -- 日租金（可选）
  deposit_amount DECIMAL(10, 2) DEFAULT 0, -- 押金
  stock_quantity INTEGER DEFAULT 0, -- 库存数量
  available_quantity INTEGER DEFAULT 0, -- 可租数量
  status VARCHAR(20) DEFAULT 'active', -- 状态：active, inactive, maintenance
  min_rental_period INTEGER DEFAULT 1, -- 最短租期（月）
  max_rental_period INTEGER, -- 最长租期（月），NULL表示无限制
  maintenance_included BOOLEAN DEFAULT true, -- 是否包含维护服务
  delivery_included BOOLEAN DEFAULT false, -- 是否包含配送服务
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 租赁订单表
CREATE TABLE IF NOT EXISTS rental_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL, -- 订单号
  restaurant_id UUID NOT NULL, -- 餐厅ID
  user_id UUID, -- 用户ID（RLS策略）
  equipment_id UUID REFERENCES equipment(id) ON DELETE RESTRICT,
  quantity INTEGER DEFAULT 1, -- 租赁数量
  rental_period INTEGER NOT NULL, -- 租期（月）
  start_date DATE NOT NULL, -- 租赁开始日期
  end_date DATE, -- 租赁结束日期（自动计算）
  monthly_rental_price DECIMAL(10, 2) NOT NULL, -- 月租金（下单时的价格）
  total_amount DECIMAL(10, 2) NOT NULL, -- 总金额
  deposit_amount DECIMAL(10, 2) DEFAULT 0, -- 押金
  payment_status VARCHAR(20) DEFAULT 'pending', -- 支付状态：pending, paid, partial, refunded
  order_status VARCHAR(20) DEFAULT 'pending', -- 订单状态：pending, confirmed, active, completed, cancelled
  payment_method VARCHAR(50), -- 支付方式：cash, alipay, wechat, bank_transfer, finance_api
  finance_api_order_id VARCHAR(100), -- 第三方金融机构订单ID（预留）
  finance_api_status VARCHAR(50), -- 第三方金融机构状态（预留）
  delivery_address TEXT, -- 配送地址
  contact_phone VARCHAR(20), -- 联系电话
  notes TEXT, -- 备注
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 租赁记录表（用于跟踪设备使用情况）
CREATE TABLE IF NOT EXISTS rental_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_order_id UUID REFERENCES rental_orders(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE RESTRICT,
  restaurant_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- 状态：active, returned, damaged, lost
  actual_start_date DATE, -- 实际开始日期
  actual_end_date DATE, -- 实际结束日期
  return_condition VARCHAR(50), -- 归还状态：good, normal_wear, damaged, lost
  damage_fee DECIMAL(10, 2) DEFAULT 0, -- 损坏赔偿费用
  notes TEXT, -- 备注
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 续租记录表
CREATE TABLE IF NOT EXISTS rental_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_order_id UUID REFERENCES rental_orders(id) ON DELETE CASCADE,
  extension_period INTEGER NOT NULL, -- 续租期数（月）
  extension_start_date DATE NOT NULL, -- 续租开始日期
  extension_end_date DATE NOT NULL, -- 续租结束日期
  monthly_rental_price DECIMAL(10, 2) NOT NULL, -- 续租月租金
  total_amount DECIMAL(10, 2) NOT NULL, -- 续租总金额
  payment_status VARCHAR(20) DEFAULT 'pending', -- 支付状态
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_rental_orders_restaurant ON rental_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_user ON rental_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_status ON rental_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_rental_orders_equipment ON rental_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_rental_records_order ON rental_records(rental_order_id);
CREATE INDEX IF NOT EXISTS idx_rental_records_equipment ON rental_records(equipment_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_equipment_categories_updated_at BEFORE UPDATE ON equipment_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_orders_updated_at BEFORE UPDATE ON rental_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_records_updated_at BEFORE UPDATE ON rental_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入设备分类数据（后厨常用设备）
INSERT INTO equipment_categories (name, description, icon, sort_order) VALUES
  ('炉灶设备', '燃气灶、电磁炉、电陶炉等', 'Flame', 1),
  ('制冷设备', '冰箱、冷柜、制冰机等', 'Snowflake', 2),
  ('排烟设备', '油烟机、排风扇、净化器等', 'Wind', 3),
  ('清洗设备', '洗碗机、消毒柜、清洗机等', 'Droplet', 4),
  ('加工设备', '切菜机、搅拌机、和面机等', 'Zap', 5),
  ('存储设备', '货架、储物柜、保鲜柜等', 'Package', 6),
  ('其他设备', '其他后厨设备', 'MoreHorizontal', 7)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- RLS 策略（Row Level Security）
-- ============================================

-- 启用 RLS
ALTER TABLE rental_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_records ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的租赁订单
CREATE POLICY "Users can view their own rental orders"
  ON rental_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 用户只能创建自己的租赁订单
CREATE POLICY "Users can create their own rental orders"
  ON rental_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的租赁订单（部分字段）
CREATE POLICY "Users can update their own rental orders"
  ON rental_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 设备分类和设备表对所有认证用户开放（只读）
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipment categories"
  ON equipment_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view equipment"
  ON equipment FOR SELECT
  TO authenticated
  USING (true);



