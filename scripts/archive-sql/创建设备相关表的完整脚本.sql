-- ============================================
-- 设备租赁系统 - 完整创建脚本
-- 包含：equipment_categories 和 equipment 表
-- ============================================

-- ============================================
-- 第一步：创建设备分类表
-- ============================================

CREATE TABLE IF NOT EXISTS equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建更新触发器
DROP TRIGGER IF EXISTS update_equipment_categories_updated_at ON equipment_categories;
CREATE TRIGGER update_equipment_categories_updated_at 
  BEFORE UPDATE ON equipment_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入初始分类数据
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
-- 第二步：创建设备表
-- ============================================

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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);

-- 创建更新触发器
DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at 
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 第三步：启用 RLS（行级安全）
-- ============================================

ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（允许所有认证用户查看）
DROP POLICY IF EXISTS "Authenticated users can view equipment categories" ON equipment_categories;
CREATE POLICY "Authenticated users can view equipment categories"
  ON equipment_categories FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view equipment" ON equipment;
CREATE POLICY "Authenticated users can view equipment"
  ON equipment FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 第四步：插入示例设备数据
-- ============================================

INSERT INTO equipment (
  category_id,
  name,
  brand,
  model,
  description,
  monthly_rental_price,
  deposit_amount,
  stock_quantity,
  available_quantity,
  status,
  min_rental_period,
  max_rental_period,
  maintenance_included,
  delivery_included
) VALUES
  (
    (SELECT id FROM equipment_categories WHERE name = '炉灶设备' LIMIT 1),
    '商用燃气灶',
    '方太',
    'FT-6BZ',
    '6眼商用燃气灶，火力强劲，适合中大型餐厅',
    800.00,
    2000.00,
    10,
    8,
    'active',
    3,
    24,
    true,
    true
  ),
  (
    (SELECT id FROM equipment_categories WHERE name = '制冷设备' LIMIT 1),
    '双门冷柜',
    '海尔',
    'BC-215',
    '215升双门冷柜，节能环保，适合小型餐厅',
    500.00,
    1500.00,
    15,
    12,
    'active',
    1,
    36,
    true,
    false
  ),
  (
    (SELECT id FROM equipment_categories WHERE name = '排烟设备' LIMIT 1),
    '商用油烟机',
    '老板',
    'CXW-200',
    '大吸力商用油烟机，静音设计',
    600.00,
    1800.00,
    8,
    6,
    'active',
    3,
    24,
    true,
    true
  ),
  (
    (SELECT id FROM equipment_categories WHERE name = '清洗设备' LIMIT 1),
    '商用洗碗机',
    '美的',
    'WQP8-3905',
    '8套商用洗碗机，高温消毒，节能省水',
    700.00,
    2500.00,
    6,
    5,
    'active',
    3,
    24,
    true,
    true
  ),
  (
    (SELECT id FROM equipment_categories WHERE name = '加工设备' LIMIT 1),
    '商用和面机',
    '小熊',
    'HMJ-A50B1',
    '50升和面机，不锈钢材质，适合面点制作',
    400.00,
    1200.00,
    12,
    10,
    'active',
    1,
    36,
    true,
    false
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 第五步：验证创建结果
-- ============================================

-- 检查表是否存在
SELECT 
  'equipment_categories' AS table_name,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'equipment_categories') 
    THEN '✅ 已创建' 
    ELSE '❌ 未创建' 
  END AS status,
  (SELECT COUNT(*) FROM equipment_categories) AS record_count
UNION ALL
SELECT 
  'equipment' AS table_name,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'equipment') 
    THEN '✅ 已创建' 
    ELSE '❌ 未创建' 
  END AS status,
  (SELECT COUNT(*) FROM equipment WHERE status = 'active') AS record_count;

-- 查看分类数据
SELECT id, name, description, icon FROM equipment_categories ORDER BY sort_order;

-- 查看设备数据
SELECT 
  e.name,
  e.brand,
  e.monthly_rental_price,
  e.available_quantity,
  ec.name AS category_name
FROM equipment e
LEFT JOIN equipment_categories ec ON e.category_id = ec.id
WHERE e.status = 'active'
ORDER BY ec.sort_order, e.name;


