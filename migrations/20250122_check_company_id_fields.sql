-- ============================================
-- 检查数据表的 company_id 字段是否存在
-- ============================================
-- 说明：此脚本用于检查哪些表缺少 company_id 字段
-- 使用方法：在 Supabase SQL Editor 中直接执行
-- ============================================

-- 创建一个临时函数来检查列是否存在
DO $$
DECLARE
    table_rec RECORD;
    column_exists BOOLEAN;
    tables_with_column TEXT[] := '{}';
    tables_without_column TEXT[] := '{}';
    tables_with_error TEXT[] := '{}';
    result_message TEXT;
BEGIN
    -- 需要检查的表列表
    FOR table_rec IN 
        SELECT unnest(ARRAY[
            'restaurants',
            'orders',
            'repair_orders',
            'delivery_orders',
            'workers',
            'devices',
            'service_points',
            'rental_orders',
            'device_rentals',
            'fuel_prices'
        ]) AS table_name
    LOOP
        BEGIN
            -- 检查列是否存在（使用表别名避免歧义）
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns c
                WHERE c.table_schema = 'public'
                AND c.table_name = table_rec.table_name
                AND c.column_name = 'company_id'
            ) INTO column_exists;

            -- 检查表是否存在（使用表别名避免歧义）
            IF EXISTS (
                SELECT 1
                FROM information_schema.tables t
                WHERE t.table_schema = 'public'
                AND t.table_name = table_rec.table_name
            ) THEN
                IF column_exists THEN
                    tables_with_column := array_append(tables_with_column, table_rec.table_name);
                ELSE
                    tables_without_column := array_append(tables_without_column, table_rec.table_name);
                END IF;
            ELSE
                tables_with_error := array_append(tables_with_error, table_rec.table_name || ' (表不存在)');
            END IF;
        EXCEPTION WHEN OTHERS THEN
            tables_with_error := array_append(tables_with_error, table_rec.table_name || ' (错误: ' || SQLERRM || ')');
        END;
    END LOOP;

    -- 打印结果
    RAISE NOTICE '===========================================================';
    RAISE NOTICE '📊 检查结果清单';
    RAISE NOTICE '===========================================================';

    IF array_length(tables_with_column, 1) > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ 已包含 company_id 字段的表 (% 个):', array_length(tables_with_column, 1);
        FOR i IN 1..array_length(tables_with_column, 1) LOOP
            RAISE NOTICE '   - %', tables_with_column[i];
        END LOOP;
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '✅ 已包含 company_id 字段的表: (无)';
    END IF;

    IF array_length(tables_without_column, 1) > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  缺少 company_id 字段的表 (% 个):', array_length(tables_without_column, 1);
        FOR i IN 1..array_length(tables_without_column, 1) LOOP
            RAISE NOTICE '   - %', tables_without_column[i];
        END LOOP;
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  缺少 company_id 字段的表: (无)';
    END IF;

    IF array_length(tables_with_error, 1) > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '❌ 检查失败的表 (% 个):', array_length(tables_with_error, 1);
        FOR i IN 1..array_length(tables_with_error, 1) LOOP
            RAISE NOTICE '   - %', tables_with_error[i];
        END LOOP;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '===========================================================';
    RAISE NOTICE '📋 汇总';
    RAISE NOTICE '===========================================================';
    RAISE NOTICE '已包含字段: % 个表', COALESCE(array_length(tables_with_column, 1), 0);
    RAISE NOTICE '缺少字段: % 个表', COALESCE(array_length(tables_without_column, 1), 0);
    RAISE NOTICE '检查失败: % 个表', COALESCE(array_length(tables_with_error, 1), 0);
    RAISE NOTICE '===========================================================';

    -- 如果有缺少字段的表，提供 SQL 示例
    IF array_length(tables_without_column, 1) > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '💡 建议：为缺少字段的表添加 company_id 字段以支持供应商数据隔离';
        RAISE NOTICE '   示例 SQL (请根据实际表结构调整):';
        RAISE NOTICE '';
        FOR i IN 1..array_length(tables_without_column, 1) LOOP
            RAISE NOTICE '   -- 为 % 表添加 company_id 字段', tables_without_column[i];
            RAISE NOTICE '   ALTER TABLE % ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;', tables_without_column[i];
            RAISE NOTICE '   CREATE INDEX IF NOT EXISTS idx_%_company_id ON %(company_id);', tables_without_column[i], tables_without_column[i];
            RAISE NOTICE '';
        END LOOP;
    END IF;

    RAISE NOTICE '✅ 检查完成';
END $$;

-- 另外，提供一个更详细的查询结果（返回表格形式）
SELECT 
    table_name AS "表名",
    CASE 
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = t.table_name
            AND column_name = 'company_id'
        ) THEN '✅ 已包含'
        ELSE '⚠️  缺少'
    END AS "company_id 字段状态",
    CASE 
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = t.table_name
        ) THEN '✅ 表存在'
        ELSE '❌ 表不存在'
    END AS "表状态"
FROM (
    SELECT unnest(ARRAY[
        'restaurants',
        'orders',
        'repair_orders',
        'delivery_orders',
        'workers',
        'devices',
        'service_points',
        'rental_orders',
        'device_rentals',
        'fuel_prices'
    ]) AS table_name
) AS t
ORDER BY 
    CASE 
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = t.table_name
            AND column_name = 'company_id'
        ) THEN 1
        ELSE 2
    END,
    table_name;
