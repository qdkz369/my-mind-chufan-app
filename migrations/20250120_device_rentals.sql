-- ============================================
-- 设备租赁表创建 - 阶段 E1
-- 创建日期: 2025-01-20
-- 说明: 创建 device_rentals 表用于表示设备的使用租赁关系
-- 设计原则: 只表示使用关系，不引入所有权判断
-- ============================================

-- ============================================
-- 1️⃣ 创建 device_rentals 表
-- ============================================

-- 创建 device_rentals 表（设备租赁关系表）
-- 说明：
-- - 表示设备的使用租赁关系（平台 / 厂家 / 租赁公司 / 金融机构参与）
-- - 只记录使用关系，不涉及所有权判断
-- - status: 'active' 表示租赁中，'ended' 表示已结束
CREATE TABLE IF NOT EXISTS device_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ, -- 可为空，表示租赁尚未结束
  status TEXT NOT NULL DEFAULT 'active',
  CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2️⃣ 创建索引
-- ============================================

-- 设备ID索引（查询某个设备的所有租赁记录）
CREATE INDEX IF NOT EXISTS idx_device_rentals_device_id ON device_rentals(device_id);

-- 餐厅ID索引（查询某个餐厅的所有租赁记录）
CREATE INDEX IF NOT EXISTS idx_device_rentals_restaurant_id ON device_rentals(restaurant_id);

-- 状态索引（查询活跃或已结束的租赁记录）
CREATE INDEX IF NOT EXISTS idx_device_rentals_status ON device_rentals(status);

-- 开始时间索引（按时间范围查询）
CREATE INDEX IF NOT EXISTS idx_device_rentals_start_at ON device_rentals(start_at DESC);

-- 结束时间索引（查询已结束的租赁记录）
CREATE INDEX IF NOT EXISTS idx_device_rentals_end_at ON device_rentals(end_at DESC);

-- 复合索引：设备ID + 状态（查询某个设备的活跃租赁）
CREATE INDEX IF NOT EXISTS idx_device_rentals_device_status ON device_rentals(device_id, status);

-- 复合索引：餐厅ID + 状态（查询某个餐厅的活跃租赁）
CREATE INDEX IF NOT EXISTS idx_device_rentals_restaurant_status ON device_rentals(restaurant_id, status);

-- ============================================
-- 3️⃣ 创建触发器
-- ============================================

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_device_rentals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_device_rentals_updated_at_trigger
BEFORE UPDATE ON device_rentals
FOR EACH ROW
EXECUTE FUNCTION update_device_rentals_updated_at();

-- ============================================
-- 4️⃣ RLS 策略（宽松策略，不强制拦截）
-- ============================================

-- 启用 RLS
ALTER TABLE device_rentals ENABLE ROW LEVEL SECURITY;

-- RLS 策略：基于公司隔离
DROP POLICY IF EXISTS "Allow all select on device_rentals" ON device_rentals;
CREATE POLICY "device_rentals_company_isolation_select"
  ON device_rentals FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow all insert on device_rentals" ON device_rentals;
CREATE POLICY "device_rentals_company_isolation_insert"
  ON device_rentals FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow all update on device_rentals" ON device_rentals;
CREATE POLICY "device_rentals_company_isolation_update"
  ON device_rentals FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

-- Service role 完全访问策略
CREATE POLICY "Service role full access to device_rentals"
ON device_rentals FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================
-- 5️⃣ 验证表创建
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_rentals') THEN
    RAISE NOTICE '✅ device_rentals 表创建成功';
  ELSE
    RAISE WARNING '❌ device_rentals 表创建失败';
  END IF;
END $$;
