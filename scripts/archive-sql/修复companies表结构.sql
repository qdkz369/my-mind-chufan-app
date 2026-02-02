-- ============================================
-- 修复 companies 表结构
-- 添加缺失的 address 字段
-- ============================================

-- 检查 companies 表是否存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') THEN
    -- 如果表不存在，创建完整的表
    CREATE TABLE companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      contact_name VARCHAR(100),
      contact_phone VARCHAR(20),
      contact_email VARCHAR(100),
      address TEXT,  -- 添加 address 字段
      business_license VARCHAR(100),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE 'companies 表已创建';
  ELSE
    -- 如果表已存在，检查并添加缺失的字段
    -- 添加 address 字段（如果不存在）
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'companies' 
      AND column_name = 'address'
    ) THEN
      ALTER TABLE companies ADD COLUMN address TEXT;
      RAISE NOTICE '已添加 address 字段';
    ELSE
      RAISE NOTICE 'address 字段已存在';
    END IF;
    
    -- 添加 updated_at 字段（如果不存在）
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'companies' 
      AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE companies ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      RAISE NOTICE '已添加 updated_at 字段';
    END IF;
    
    -- 创建 updated_at 触发器（如果不存在）
    CREATE OR REPLACE FUNCTION update_companies_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON companies;
    CREATE TRIGGER trigger_update_companies_updated_at
      BEFORE UPDATE ON companies
      FOR EACH ROW
      EXECUTE FUNCTION update_companies_updated_at();
    
    RAISE NOTICE 'companies 表结构已更新';
  END IF;
END $$;

-- 验证表结构
SELECT 
  column_name AS 字段名,
  data_type AS 数据类型,
  is_nullable AS 可为空,
  column_default AS 默认值
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies'
ORDER BY ordinal_position;

-- 验证结果
SELECT 
  'companies 表结构修复完成！' AS 消息,
  COUNT(*) AS 字段数量
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies';


