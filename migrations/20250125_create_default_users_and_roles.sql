-- ============================================
-- 创建默认用户角色数据
-- 为现有用户分配角色，确保系统正常运行
-- ============================================

-- 检查并创建默认角色数据
DO $$
DECLARE
    user_record RECORD;
    role_count INTEGER;
BEGIN
    -- 检查是否有用户角色数据
    SELECT COUNT(*) INTO role_count FROM user_roles;
    
    IF role_count = 0 THEN
        RAISE NOTICE '没有找到用户角色数据，开始为现有用户分配默认角色...';
        
        -- 为所有现有的认证用户分配默认角色
        FOR user_record IN 
            SELECT 
                au.id as user_id,
                au.email,
                au.created_at
            FROM auth.users au
            WHERE au.deleted_at IS NULL
            ORDER BY au.created_at ASC
        LOOP
            -- 第一个用户设为超级管理员，其余设为员工
            IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'super_admin') THEN
                -- 第一个用户设为超级管理员
                INSERT INTO user_roles (user_id, role, created_at)
                VALUES (user_record.user_id, 'super_admin', NOW());
                
                RAISE NOTICE '已将用户 % (%) 设置为超级管理员', user_record.email, user_record.user_id;
            ELSE
                -- 其他用户设为员工
                INSERT INTO user_roles (user_id, role, created_at)
                VALUES (user_record.user_id, 'staff', NOW());
                
                RAISE NOTICE '已将用户 % (%) 设置为员工', user_record.email, user_record.user_id;
            END IF;
        END LOOP;
    ELSE
        RAISE NOTICE '已存在 % 条用户角色数据，跳过默认角色创建', role_count;
    END IF;
END $$;

-- 为现有用户创建餐厅关联数据（如果不存在）
DO $$
DECLARE
    user_record RECORD;
    restaurant_count INTEGER;
    company_record RECORD;
BEGIN
    -- 检查是否有餐厅数据
    SELECT COUNT(*) INTO restaurant_count FROM restaurants;
    
    IF restaurant_count = 0 THEN
        RAISE NOTICE '没有找到餐厅数据，开始为用户创建默认餐厅...';
        
        -- 确保存在一个默认公司
        INSERT INTO companies (id, name, description, created_at)
        VALUES (
            gen_random_uuid(),
            '默认公司',
            '系统自动创建的默认公司',
            NOW()
        )
        ON CONFLICT DO NOTHING
        RETURNING id, name INTO company_record;
        
        -- 如果没有返回值，说明公司已存在，获取第一个公司
        IF company_record.id IS NULL THEN
            SELECT id, name INTO company_record 
            FROM companies 
            ORDER BY created_at ASC 
            LIMIT 1;
        END IF;
        
        RAISE NOTICE '使用公司: % (%)', company_record.name, company_record.id;
        
        -- 为所有有角色的用户创建餐厅
        FOR user_record IN 
            SELECT 
                ur.user_id,
                au.email,
                ur.role
            FROM user_roles ur
            JOIN auth.users au ON ur.user_id = au.id
            WHERE au.deleted_at IS NULL
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
                created_at
            )
            VALUES (
                gen_random_uuid(),
                user_record.user_id,
                company_record.id,
                '默认餐厅 - ' || COALESCE(user_record.email, '未知用户'),
                COALESCE(user_record.email, '未知用户'),
                '13800000000',
                '默认地址',
                NOW()
            )
            ON CONFLICT (user_id) DO NOTHING;
            
            RAISE NOTICE '已为用户 % 创建餐厅记录', user_record.email;
        END LOOP;
    ELSE
        RAISE NOTICE '已存在 % 条餐厅数据，跳过默认餐厅创建', restaurant_count;
    END IF;
END $$;

-- 验证创建结果
SELECT 
    '用户角色统计' AS 类型,
    ur.role AS 角色,
    COUNT(*) AS 数量,
    STRING_AGG(au.email, ', ') AS 用户列表
FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.deleted_at IS NULL
GROUP BY ur.role
ORDER BY 
    CASE ur.role 
        WHEN 'super_admin' THEN 1
        WHEN 'platform_admin' THEN 2
        WHEN 'company_admin' THEN 3
        WHEN 'staff' THEN 4
        WHEN 'factory' THEN 5
        WHEN 'filler' THEN 6
        ELSE 7
    END;

-- 验证餐厅关联
SELECT 
    '餐厅关联统计' AS 类型,
    ur.role AS 用户角色,
    COUNT(r.id) AS 餐厅数量,
    COUNT(DISTINCT r.company_id) AS 关联公司数量
FROM user_roles ur
LEFT JOIN restaurants r ON ur.user_id = r.user_id
JOIN auth.users au ON ur.user_id = au.id
WHERE au.deleted_at IS NULL
GROUP BY ur.role
ORDER BY 
    CASE ur.role 
        WHEN 'super_admin' THEN 1
        WHEN 'platform_admin' THEN 2
        WHEN 'company_admin' THEN 3
        WHEN 'staff' THEN 4
        WHEN 'factory' THEN 5
        WHEN 'filler' THEN 6
        ELSE 7
    END;

-- 显示完整的用户-角色-餐厅关联信息
SELECT 
    au.email AS 用户邮箱,
    ur.role AS 用户角色,
    r.name AS 餐厅名称,
    c.name AS 公司名称,
    r.company_id AS 公司ID,
    ur.created_at AS 角色创建时间
FROM auth.users au
JOIN user_roles ur ON au.id = ur.user_id
LEFT JOIN restaurants r ON au.id = r.user_id
LEFT JOIN companies c ON r.company_id = c.id
WHERE au.deleted_at IS NULL
ORDER BY ur.created_at ASC;