-- ============================================
-- 验证协议管理和租赁合同相关表
-- 创建日期: 2025-01-25
-- 说明: 用于验证表是否已成功创建
-- ============================================

-- 检查表是否存在
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('agreements', 'rental_contracts', 'rental_contract_devices') 
    THEN '✅ 存在' 
    ELSE '❌ 不存在' 
  END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('agreements', 'rental_contracts', 'rental_contract_devices')
ORDER BY table_name;

-- 检查 agreements 表的列
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'agreements'
ORDER BY ordinal_position;

-- 检查 rental_contracts 表的列
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'rental_contracts'
ORDER BY ordinal_position;

-- 检查索引
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('agreements', 'rental_contracts', 'rental_contract_devices')
ORDER BY tablename, indexname;

-- 检查触发器
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS enabled
FROM pg_trigger
WHERE tgrelid IN (
  SELECT oid FROM pg_class 
  WHERE relname IN ('agreements', 'rental_contracts', 'rental_contract_devices')
)
AND tgisinternal = false
ORDER BY table_name, trigger_name;
