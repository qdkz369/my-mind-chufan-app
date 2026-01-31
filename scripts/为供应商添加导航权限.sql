-- ============================================
-- 为供应商公司添加导航权限
-- 执行后供应商登录将看到：工作台 + 餐厅管理 + 订单管理 + 报修管理 等
-- 原因：companyId 来自 user_companies (is_primary=true)，无记录则无法加载权限和导航
-- ============================================

-- 步骤0：确保用户有 is_primary=true 的公司关联（否则 companyId 为空，仅显示工作台）
-- 0a. 若无任何记录，插入一条
INSERT INTO user_companies (user_id, company_id, is_primary, role)
SELECT 
  au.id,
  (SELECT id FROM companies LIMIT 1),
  true,
  'admin'
FROM auth.users au
WHERE au.email = '13900139001@139.com'
  AND NOT EXISTS (SELECT 1 FROM user_companies uc WHERE uc.user_id = au.id);

-- 0b. 若有记录但 is_primary 全为 false，将第一条设为 true
UPDATE user_companies uc
SET is_primary = true
FROM (
  SELECT user_id, company_id FROM user_companies
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '13900139001@139.com')
  LIMIT 1
) sub
WHERE uc.user_id = sub.user_id AND uc.company_id = sub.company_id
  AND NOT EXISTS (
    SELECT 1 FROM user_companies uc2 
    WHERE uc2.user_id = uc.user_id AND uc2.is_primary = true
  );

-- 步骤1：为 13900139001@139.com 关联的公司添加常用供应商权限
INSERT INTO company_permissions (company_id, permission_key, enabled)
SELECT uc.company_id, p.key, true
FROM user_companies uc
CROSS JOIN (
  VALUES 
    ('restaurants'),
    ('orders'),
    ('repairs'),
    ('equipmentRental'),
    ('rentals'),
    ('devices'),
    ('workers'),
    ('fuelPricing'),
    ('agreements'),
    ('analytics'),
    ('financeReport'),
    ('exceptionHandling'),
    ('settings')
) AS p(key)
WHERE uc.user_id = (SELECT id FROM auth.users WHERE email = '13900139001@139.com')
  AND uc.is_primary = true
ON CONFLICT (company_id, permission_key) DO UPDATE SET enabled = true;

-- 验证1：确认 user_companies 有 is_primary=true 的记录（companyId 来源）
SELECT 
  au.email as 邮箱,
  uc.company_id as 公司ID,
  uc.is_primary as 是否主公司,
  c.name as 公司名
FROM auth.users au
LEFT JOIN user_companies uc ON uc.user_id = au.id AND uc.is_primary = true
LEFT JOIN companies c ON c.id = uc.company_id
WHERE au.email = '13900139001@139.com';
-- 期望：is_primary=true，公司ID和公司名有值

-- 验证2：查看添加后的权限
SELECT 
  c.name as 公司名,
  cp.permission_key as 权限键,
  cp.enabled as 已启用
FROM company_permissions cp
JOIN companies c ON c.id = cp.company_id
WHERE cp.company_id = (
  SELECT company_id FROM user_companies 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '13900139001@139.com')
  AND is_primary = true
  LIMIT 1
)
AND cp.enabled = true
ORDER BY cp.permission_key;
