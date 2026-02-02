-- 验证用户-角色-餐厅关联情况
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