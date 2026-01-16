-- ============================================
-- 为数据表添加 company_id 字段以支持供应商数据隔离
-- ============================================
-- 执行日期：2025-01-22
-- 说明：为以下表添加 company_id 字段，实现供应商数据隔离
-- ============================================

-- 1. restaurants 表
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS company_id UUID 
REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_company_id 
ON restaurants(company_id);

-- 2. orders 表（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'orders') THEN
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS company_id UUID 
        REFERENCES companies(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_orders_company_id 
        ON orders(company_id);
    END IF;
END $$;

-- 3. repair_orders 表
ALTER TABLE repair_orders 
ADD COLUMN IF NOT EXISTS company_id UUID 
REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_repair_orders_company_id 
ON repair_orders(company_id);

-- 4. delivery_orders 表
ALTER TABLE delivery_orders 
ADD COLUMN IF NOT EXISTS company_id UUID 
REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_orders_company_id 
ON delivery_orders(company_id);

-- 5. workers 表
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS company_id UUID 
REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workers_company_id 
ON workers(company_id);

-- 6. devices 表
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS company_id UUID 
REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_devices_company_id 
ON devices(company_id);

-- 7. service_points 表
ALTER TABLE service_points 
ADD COLUMN IF NOT EXISTS company_id UUID 
REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_points_company_id 
ON service_points(company_id);

-- 8. rental_orders 表
ALTER TABLE rental_orders 
ADD COLUMN IF NOT EXISTS company_id UUID 
REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rental_orders_company_id 
ON rental_orders(company_id);

-- ============================================
-- 验证：检查所有字段是否成功添加
-- ============================================
DO $$
DECLARE
    tbl_name TEXT;
    column_exists BOOLEAN;
    missing_tables TEXT[] := '{}';
BEGIN
    FOR tbl_name IN 
        SELECT unnest(ARRAY[
            'restaurants',
            'repair_orders',
            'delivery_orders',
            'workers',
            'devices',
            'service_points',
            'rental_orders'
        ])
    LOOP
        -- 检查表是否存在（使用表别名避免变量名冲突）
        IF EXISTS (
            SELECT 1 FROM information_schema.tables t
            WHERE t.table_schema = 'public' AND t.table_name = tbl_name
        ) THEN
            -- 检查列是否存在（使用表别名避免变量名冲突）
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns c
                WHERE c.table_schema = 'public'
                AND c.table_name = tbl_name
                AND c.column_name = 'company_id'
            ) INTO column_exists;
            
            IF NOT column_exists THEN
                missing_tables := array_append(missing_tables, tbl_name);
            END IF;
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '⚠️  以下表的 company_id 字段添加失败: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ 所有表的 company_id 字段已成功添加';
    END IF;
END $$;
