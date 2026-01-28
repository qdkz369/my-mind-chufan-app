-- ============================================
-- 修复用户-餐厅关联数据
-- 为现有用户创建必要的餐厅关联，解决 401 错误
-- ============================================

-- 检查并创建 companies 表（如果不存在）
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 检查并创建 restaurants 表（如果不存在）  
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 确保 user_id 有 UNIQUE 约束（用于 ON CONFLICT）
DO $$
BEGIN
    -- 检查是否已经有 user_id 的唯一约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'restaurants' 
        AND tc.constraint_type = 'UNIQUE' 
        AND ccu.column_name = 'user_id'
    ) THEN
        -- 先删除可能存在的重复数据
        DELETE FROM restaurants r1 
        WHERE EXISTS (
            SELECT 1 FROM restaurants r2 
            WHERE r2.user_id = r1.user_id 
            AND r2.created_at > r1.created_at
        );
        
        -- 添加唯一约束
        ALTER TABLE restaurants ADD CONSTRAINT restaurants_user_id_unique UNIQUE (user_id);
        RAISE NOTICE '✅ 已为 restaurants 表添加 user_id 唯一约束';
    ELSE
        RAISE NOTICE '✅ restaurants 表的 user_id 唯一约束已存在';
    END IF;
END $$;

-- 为现有用户创建餐厅关联数据
DO $$
DECLARE
    user_record RECORD;
    company_record RECORD;
    restaurant_count INTEGER;
    company_count INTEGER;
BEGIN
    -- 检查公司数量
    SELECT COUNT(*) INTO company_count FROM companies;
    
    -- 如果没有公司，创建默认公司
    IF company_count = 0 THEN
        INSERT INTO companies (id, name, description, created_at)
        VALUES (
            gen_random_uuid(),
            '默认公司',
            '系统自动创建的默认公司，用于用户权限管理',
            NOW()
        )
        RETURNING id, name INTO company_record;
        
        RAISE NOTICE '✅ 已创建默认公司: % (%)', company_record.name, company_record.id;
    ELSE
        -- 使用第一个公司
        SELECT id, name INTO company_record 
        FROM companies 
        ORDER BY created_at ASC 
        LIMIT 1;
        
        RAISE NOTICE '✅ 使用现有公司: % (%)', company_record.name, company_record.id;
    END IF;
    
    -- 为所有有角色但没有餐厅的用户创建餐厅
    RAISE NOTICE '开始为用户创建餐厅关联...';
    
    FOR user_record IN 
        SELECT 
            ur.user_id,
            au.email,
            ur.role
        FROM user_roles ur
        JOIN auth.users au ON ur.user_id = au.id
        LEFT JOIN restaurants r ON ur.user_id = r.user_id
        WHERE au.deleted_at IS NULL 
          AND r.id IS NULL  -- 没有餐厅关联的用户
    LOOP
        -- 创建餐厅记录
        INSERT INTO restaurants (
            id,
            user_id,
            company_id,
            name,
            contact_name,
            contact_phone,
            address,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            user_record.user_id,
            company_record.id,
            '默认餐厅 - ' || COALESCE(user_record.email, '未知用户'),
            COALESCE(user_record.email, '系统用户'),
            '13800000000',
            '系统默认地址',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            updated_at = NOW();
        
        RAISE NOTICE '✅ 已为用户 % (%) 创建餐厅关联', user_record.email, user_record.role;
    END LOOP;
    
    -- 统计结果
    SELECT COUNT(*) INTO restaurant_count FROM restaurants;
    RAISE NOTICE '✅ 餐厅创建完成，当前共有 % 个餐厅', restaurant_count;
    
END $$;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_restaurants_user_id ON restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_company_id ON restaurants(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- 启用 RLS（如果尚未启用）
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- 为 companies 表创建 Service Role 策略
DROP POLICY IF EXISTS "Service role full access to companies" ON companies;
CREATE POLICY "Service role full access to companies"
  ON companies FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 为 restaurants 表创建 Service Role 策略
DROP POLICY IF EXISTS "Service role full access to restaurants" ON restaurants;
CREATE POLICY "Service role full access to restaurants"
  ON restaurants FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 为 restaurants 表创建用户访问策略
DROP POLICY IF EXISTS "Users can access their own restaurant" ON restaurants;
CREATE POLICY "Users can access their own restaurant"
  ON restaurants FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 验证修复结果
SELECT 
    '=== 用户-角色-餐厅关联验证 ===' AS 标题;

SELECT 
    au.email AS 用户邮箱,
    ur.role AS 用户角色,
    r.name AS 餐厅名称,
    c.name AS 公司名称,
    r.company_id AS 公司ID,
    CASE 
        WHEN r.id IS NOT NULL THEN '✅ 已关联'
        ELSE '❌ 未关联'
    END AS 关联状态
FROM auth.users au
JOIN user_roles ur ON au.id = ur.user_id
LEFT JOIN restaurants r ON au.id = r.user_id
LEFT JOIN companies c ON r.company_id = c.id
WHERE au.deleted_at IS NULL
ORDER BY ur.created_at ASC;

-- 显示系统统计
SELECT 
    '=== 系统数据统计 ===' AS 标题;
    
SELECT 
    'users' AS 表名,
    COUNT(*) AS 记录数
FROM auth.users
WHERE deleted_at IS NULL
UNION ALL
SELECT 
    'user_roles' AS 表名,
    COUNT(*) AS 记录数
FROM user_roles
UNION ALL
SELECT 
    'companies' AS 表名,
    COUNT(*) AS 记录数
FROM companies
UNION ALL
SELECT 
    'restaurants' AS 表名,
    COUNT(*) AS 记录数
FROM restaurants
ORDER BY 表名;