-- 调试认证问题的快速查询

-- 检查测试手机号是否存在并有正确的数据
SELECT 
    '=== 测试手机号数据状态 ===' as info;

WITH test_phones AS (
    SELECT phone FROM (
        VALUES 
        ('13800138001'),
        ('13700137001'), 
        ('18508858978')
    ) AS t(phone)
),
user_full_info AS (
    SELECT 
        tp.phone as test_phone,
        au.id as user_id,
        au.email,
        au.phone as actual_phone,
        ur.role,
        r.id as restaurant_id,
        r.name as restaurant_name,
        r.company_id,
        c.name as company_name,
        COUNT(d.device_id) as device_count
    FROM test_phones tp
    LEFT JOIN auth.users au ON tp.phone = au.phone
    LEFT JOIN user_roles ur ON au.id = ur.user_id
    LEFT JOIN restaurants r ON au.id = r.user_id
    LEFT JOIN companies c ON r.company_id = c.id  
    LEFT JOIN devices d ON r.id = d.restaurant_id
    GROUP BY tp.phone, au.id, au.email, au.phone, ur.role, r.id, r.name, r.company_id, c.name
)
SELECT 
    test_phone as "手机号",
    CASE 
        WHEN user_id IS NULL THEN '❌ 用户不存在'
        ELSE '✅ 用户存在'
    END as "用户状态",
    email as "邮箱",
    role as "角色", 
    restaurant_name as "餐厅名称",
    company_name as "公司名称",
    device_count as "绑定设备数",
    CASE
        WHEN user_id IS NULL THEN '需要创建用户'
        WHEN role IS NULL THEN '需要分配角色' 
        WHEN restaurant_id IS NULL THEN '需要关联餐厅'
        WHEN company_id IS NULL THEN '需要设置公司ID'
        WHEN device_count = 0 THEN '需要绑定设备'
        ELSE '✅ 数据完整'
    END as "问题诊断"
FROM user_full_info
ORDER BY test_phone;

-- 检查必要的表是否存在
SELECT 
    '=== 核心表状态检查 ===' as info;

SELECT 
    schemaname, 
    tablename,
    CASE 
        WHEN schemaname = 'auth' AND tablename = 'users' THEN '✅ 认证表'
        WHEN tablename = 'user_roles' THEN '✅ 角色表' 
        WHEN tablename = 'restaurants' THEN '✅ 餐厅表'
        WHEN tablename = 'companies' THEN '✅ 公司表'
        WHEN tablename = 'devices' THEN '✅ 设备表'
        WHEN tablename = 'order_main' THEN '✅ 订单主表'
        ELSE '其他表'
    END as "表类型",
    (SELECT COUNT(*) FROM information_schema.tables t2 WHERE t2.table_name = t1.tablename AND t2.table_schema = t1.schemaname) > 0 as "存在状态"
FROM information_schema.tables t1 
WHERE (
    (schemaname = 'auth' AND tablename = 'users') OR
    (schemaname = 'public' AND tablename IN ('user_roles', 'restaurants', 'companies', 'devices', 'order_main'))
)
ORDER BY schemaname, tablename;