-- 检查当前用户数据和设备绑定情况

-- 1. 检查所有用户及其角色
SELECT 
    '=== 用户角色信息 ===' as section;

SELECT 
    au.email AS 用户邮箱,
    au.phone AS 手机号,
    ur.role AS 用户角色,
    ur.created_at AS 角色创建时间,
    CASE 
        WHEN au.deleted_at IS NULL THEN '✅ 正常'
        ELSE '❌ 已删除'
    END AS 用户状态
FROM auth.users au
LEFT JOIN user_roles ur ON au.id = ur.user_id
WHERE au.deleted_at IS NULL
ORDER BY ur.created_at DESC;

-- 2. 检查餐厅关联情况
SELECT 
    '=== 餐厅关联信息 ===' as section;

SELECT 
    au.email AS 用户邮箱,
    au.phone AS 手机号,
    r.id AS 餐厅ID,
    r.name AS 餐厅名称,
    c.name AS 公司名称,
    r.company_id AS 公司ID,
    CASE 
        WHEN r.id IS NOT NULL THEN '✅ 已关联'
        ELSE '❌ 未关联'
    END AS 餐厅关联状态
FROM auth.users au
LEFT JOIN restaurants r ON au.id = r.user_id
LEFT JOIN companies c ON r.company_id = c.id
WHERE au.deleted_at IS NULL
ORDER BY au.created_at DESC;

-- 3. 检查设备绑定情况
SELECT 
    '=== 设备绑定信息 ===' as section;

SELECT 
    au.email AS 用户邮箱,
    au.phone AS 手机号,
    r.name AS 餐厅名称,
    d.device_id AS 设备ID,
    d.device_name AS 设备名称,
    d.device_type AS 设备类型,
    d.status AS 设备状态,
    CASE 
        WHEN d.device_id IS NOT NULL THEN '✅ 已绑定设备'
        ELSE '❌ 未绑定设备'
    END AS 设备绑定状态
FROM auth.users au
LEFT JOIN restaurants r ON au.id = r.user_id
LEFT JOIN devices d ON r.id = d.restaurant_id
WHERE au.deleted_at IS NULL
ORDER BY au.created_at DESC, d.created_at DESC;

-- 4. 检查order_main表是否存在订单
SELECT 
    '=== 订单主表信息 ===' as section;

SELECT 
    COUNT(*) as 订单总数,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as 待处理订单,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as 已完成订单,
    COUNT(CASE WHEN order_type = 'fuel' THEN 1 END) as 燃料订单,
    COUNT(CASE WHEN order_type = 'rental' THEN 1 END) as 租赁订单
FROM order_main;

-- 5. 检查具体测试手机号的情况
SELECT 
    '=== 测试手机号详细情况 ===' as section;

SELECT 
    au.phone AS 手机号,
    au.email AS 用户邮箱,
    ur.role AS 角色,
    r.name AS 餐厅名称,
    r.id AS 餐厅ID,
    COUNT(d.device_id) AS 绑定设备数量,
    STRING_AGG(d.device_name, ', ') AS 设备列表
FROM auth.users au
LEFT JOIN user_roles ur ON au.id = ur.user_id  
LEFT JOIN restaurants r ON au.id = r.user_id
LEFT JOIN devices d ON r.id = d.restaurant_id
WHERE au.phone IN ('13800138001', '13700137001', '18508858978')
GROUP BY au.phone, au.email, ur.role, r.name, r.id
ORDER BY au.phone;