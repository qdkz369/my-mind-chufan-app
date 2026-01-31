-- ============================================
-- 供应商权限与数据隔离 - 配置与验证脚本
-- 用于排查供应商登录后仍看到全量数据的问题
-- ============================================

-- 1. 检查当前供应商账号 13900139001@139.com 的角色与公司关联
SELECT 
  au.id as user_id,
  au.email,
  ur.role,
  uc.company_id,
  uc.is_primary,
  c.name as company_name
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN user_companies uc ON uc.user_id = au.id
LEFT JOIN companies c ON c.id = uc.company_id
WHERE au.email = '13900139001@139.com';

-- 2. 检查该用户是否通过 restaurants 表关联了公司（user-context 已改为仅从 user_companies 获取）
SELECT 
  r.id,
  r.name,
  r.company_id,
  r.user_id,
  c.name as company_name
FROM restaurants r
LEFT JOIN companies c ON c.id = r.company_id
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = '13900139001@139.com');

-- 3. 检查该用户公司下的餐厅数量（若有关联公司）
WITH user_company AS (
  SELECT company_id FROM user_companies 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '13900139001@139.com')
  AND is_primary = true
  LIMIT 1
)
SELECT COUNT(*) as 本公司餐厅数
FROM restaurants r, user_company uc
WHERE r.company_id = uc.company_id;

-- 4. 检查该用户公司的 company_permissions 配置
WITH user_company AS (
  SELECT company_id FROM user_companies 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = '13900139001@139.com')
  AND is_primary = true
  LIMIT 1
)
SELECT cp.permission_key, cp.enabled
FROM company_permissions cp, user_company uc
WHERE cp.company_id = uc.company_id AND cp.enabled = true;

-- ============================================
-- 修复建议
-- ============================================
-- 
-- 情况A：供应商应看到空数据（仅工作台，无餐厅/订单）
--   → 确保该用户未在 user_companies 中关联任何公司
--   → 执行：DELETE FROM user_companies WHERE user_id = (SELECT id FROM auth.users WHERE email = '13900139001@139.com');
--
-- 情况B：供应商应看到本公司数据
--   → 确保在 user_companies 中正确关联公司，且 is_primary = true
--   → 为该公司在 company_permissions 中配置可见的菜单（permission_key 对应菜单 key）
--   → 示例：为某公司添加「餐厅管理」「订单管理」权限
--     INSERT INTO company_permissions (company_id, permission_key, enabled)
--     SELECT id, 'restaurants', true FROM companies WHERE name = 'xxx公司'
--     ON CONFLICT (company_id, permission_key) DO UPDATE SET enabled = true;
--     INSERT INTO company_permissions (company_id, permission_key, enabled)
--     SELECT id, 'orders', true FROM companies WHERE name = 'xxx公司'
--     ON CONFLICT (company_id, permission_key) DO UPDATE SET enabled = true;
--
-- permission_key 可选值（对应侧栏菜单）：
-- dashboard, restaurants, orders, repairs, equipmentRental, rentals,
-- productApproval, supplierManagement, devices, workers, fuelPricing,
-- agreements, api, analytics, financeReport, exceptionHandling, settings
--
