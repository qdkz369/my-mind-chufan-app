-- 修复测试用户数据脚本

-- 1. 确保测试用户存在并有正确的数据
-- 注意：这里假设用户已经通过 Supabase Auth 创建

-- 首先检查现有用户
SELECT 
    '=== 当前用户状态 ===' as step;

SELECT 
    au.phone,
    au.email,
    au.id as user_id,
    ur.role,
    r.name as restaurant_name,
    COUNT(d.device_id) as device_count
FROM auth.users au
LEFT JOIN user_roles ur ON au.id = ur.user_id
LEFT JOIN restaurants r ON au.id = r.user_id  
LEFT JOIN devices d ON r.id = d.restaurant_id
WHERE au.phone IN ('13800138001', '13700137001', '18508858978')
GROUP BY au.phone, au.email, au.id, ur.role, r.name
ORDER BY au.phone;

-- 2. 为存在的用户添加角色（如果缺失）
-- 注意：需要根据实际的用户ID进行调整

-- 创建默认公司（如果不存在）
INSERT INTO companies (name, code, created_at, updated_at)
VALUES ('测试餐饮公司', 'TEST_COMPANY_001', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- 获取公司ID
WITH company_info AS (
    SELECT id as company_id FROM companies WHERE code = 'TEST_COMPANY_001' LIMIT 1
),
-- 为每个测试手机号创建用户数据（如果用户存在的话）
test_user_setup AS (
    SELECT 
        au.id as user_id,
        au.phone,
        au.email,
        ci.company_id
    FROM auth.users au
    CROSS JOIN company_info ci
    WHERE au.phone IN ('13800138001', '13700137001', '18508858978')
      AND au.deleted_at IS NULL
)
-- 插入或更新角色
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
    user_id,
    'staff' as role,
    NOW(),
    NOW()
FROM test_user_setup
ON CONFLICT (user_id) DO UPDATE SET
    role = 'staff',
    updated_at = NOW();

-- 3. 创建餐厅关联（如果不存在）
WITH company_info AS (
    SELECT id as company_id FROM companies WHERE code = 'TEST_COMPANY_001' LIMIT 1
),
test_users AS (
    SELECT 
        au.id as user_id,
        au.phone,
        ci.company_id
    FROM auth.users au
    CROSS JOIN company_info ci
    WHERE au.phone IN ('13800138001', '13700137001', '18508858978')
      AND au.deleted_at IS NULL
)
INSERT INTO restaurants (
    name, 
    user_id, 
    company_id,
    contact_name,
    contact_phone,
    address,
    created_at,
    updated_at
)
SELECT 
    '测试餐厅-' || tu.phone,
    tu.user_id,
    tu.company_id,
    '测试联系人-' || tu.phone,
    tu.phone,
    '测试地址-' || tu.phone,
    NOW(),
    NOW()
FROM test_users tu
ON CONFLICT (user_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    updated_at = NOW();

-- 4. 为 13800138001 创建3台测试设备
WITH test_user AS (
    SELECT r.id as restaurant_id 
    FROM auth.users au
    JOIN restaurants r ON au.id = r.user_id
    WHERE au.phone = '13800138001'
    LIMIT 1
),
device_data AS (
    SELECT 
        tr.restaurant_id,
        'DEVICE_' || LPAD((ROW_NUMBER() OVER())::text, 3, '0') as device_id,
        '测试设备-' || (ROW_NUMBER() OVER()) as device_name,
        'kitchen_equipment' as device_type
    FROM test_user tr
    CROSS JOIN generate_series(1, 3) as device_num
)
INSERT INTO devices (
    device_id,
    device_name,
    device_type,
    restaurant_id,
    status,
    created_at,
    updated_at
)
SELECT 
    device_id,
    device_name,
    device_type,
    restaurant_id,
    'active',
    NOW(),
    NOW()
FROM device_data
ON CONFLICT (device_id) DO UPDATE SET
    restaurant_id = EXCLUDED.restaurant_id,
    updated_at = NOW();

-- 5. 验证结果
SELECT 
    '=== 修复后状态验证 ===' as step;

SELECT 
    au.phone as "手机号",
    au.email as "邮箱",
    ur.role as "角色",
    r.name as "餐厅名称",
    c.name as "公司名称",
    COUNT(d.device_id) as "设备数量",
    CASE 
        WHEN COUNT(d.device_id) > 0 THEN '✅ 数据完整'
        ELSE '⚠️ 缺少设备'
    END as "状态"
FROM auth.users au
LEFT JOIN user_roles ur ON au.id = ur.user_id
LEFT JOIN restaurants r ON au.id = r.user_id
LEFT JOIN companies c ON r.company_id = c.id
LEFT JOIN devices d ON r.id = d.restaurant_id
WHERE au.phone IN ('13800138001', '13700137001', '18508858978')
  AND au.deleted_at IS NULL
GROUP BY au.phone, au.email, ur.role, r.name, c.name
ORDER BY au.phone;