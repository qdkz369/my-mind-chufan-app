-- ============================================
-- 修复 agreements 和 rental_contracts 表的 service_role RLS 策略
-- 创建日期: 2025-01-25
-- 说明: 添加 service_role 的 RLS 策略，允许 API 路由使用 serviceRoleKey 绕过 RLS
-- ============================================

-- ============================================
-- 1️⃣ 为 agreements 表添加 service_role 策略
-- ============================================

-- 服务角色完全访问（API 路由使用 serviceRoleKey 时绕过 RLS）
DROP POLICY IF EXISTS "Service role full access to agreements" ON agreements;
CREATE POLICY "Service role full access to agreements"
  ON agreements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2️⃣ 为 rental_contracts 表添加 service_role 策略
-- ============================================

-- 服务角色完全访问（API 路由使用 serviceRoleKey 时绕过 RLS）
DROP POLICY IF EXISTS "Service role full access to rental_contracts" ON rental_contracts;
CREATE POLICY "Service role full access to rental_contracts"
  ON rental_contracts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3️⃣ 为 rental_contract_devices 表添加 service_role 策略
-- ============================================

-- 服务角色完全访问（API 路由使用 serviceRoleKey 时绕过 RLS）
DROP POLICY IF EXISTS "Service role full access to rental_contract_devices" ON rental_contract_devices;
CREATE POLICY "Service role full access to rental_contract_devices"
  ON rental_contract_devices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4️⃣ 验证策略创建
-- ============================================

DO $$
DECLARE
  agreements_policy_exists BOOLEAN;
  rental_contracts_policy_exists BOOLEAN;
  rental_contract_devices_policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'agreements'
    AND policyname = 'Service role full access to agreements'
  ) INTO agreements_policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rental_contracts'
    AND policyname = 'Service role full access to rental_contracts'
  ) INTO rental_contracts_policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rental_contract_devices'
    AND policyname = 'Service role full access to rental_contract_devices'
  ) INTO rental_contract_devices_policy_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Service Role RLS 策略验证结果：';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'agreements 表 service_role 策略: %', CASE WHEN agreements_policy_exists THEN '✅ 存在' ELSE '❌ 不存在' END;
  RAISE NOTICE 'rental_contracts 表 service_role 策略: %', CASE WHEN rental_contracts_policy_exists THEN '✅ 存在' ELSE '❌ 不存在' END;
  RAISE NOTICE 'rental_contract_devices 表 service_role 策略: %', CASE WHEN rental_contract_devices_policy_exists THEN '✅ 存在' ELSE '❌ 不存在' END;
  RAISE NOTICE '========================================';
END $$;
