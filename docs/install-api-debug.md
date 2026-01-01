# 安装 API 调试指南

## 问题诊断步骤

### 1. 检查 devices 表是否存在

在 Supabase SQL Editor 中执行：

```sql
-- 检查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'devices';
```

如果返回空，说明表不存在，需要创建。

### 2. 检查表结构

```sql
-- 检查表结构
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'devices'
ORDER BY ordinal_position;
```

### 3. 检查主键约束

```sql
-- 检查主键
SELECT 
    constraint_name, 
    constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'devices' 
AND constraint_type = 'PRIMARY KEY';
```

### 4. 检查 RLS (Row Level Security) 策略

```sql
-- 检查 RLS 是否启用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'devices';

-- 检查策略
SELECT * FROM pg_policies WHERE tablename = 'devices';
```

## 修复方案

### 方案 1: 如果表不存在，创建表

```sql
-- 创建 devices 表
CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  model TEXT,
  address TEXT,
  installer TEXT,
  install_date TIMESTAMPTZ,
  status TEXT DEFAULT 'ready',
  is_locked BOOLEAN DEFAULT false,
  restaurant_id UUID REFERENCES restaurants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引（可选，提高查询性能）
CREATE INDEX IF NOT EXISTS idx_devices_restaurant_id ON devices(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
```

### 方案 2: 如果表存在但缺少字段

```sql
-- 添加缺失的字段（如果不存在）
DO $$ 
BEGIN
  -- 添加 created_at（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE devices ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- 添加 updated_at（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE devices ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- 添加 status（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'status'
  ) THEN
    ALTER TABLE devices ADD COLUMN status TEXT DEFAULT 'ready';
  END IF;

  -- 添加 is_locked（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE devices ADD COLUMN is_locked BOOLEAN DEFAULT false;
  END IF;
END $$;
```

### 方案 3: 修复主键约束

```sql
-- 如果 device_id 不是主键，先删除旧约束（如果有）
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_pkey;

-- 设置 device_id 为主键
ALTER TABLE devices ADD PRIMARY KEY (device_id);
```

### 方案 4: 配置 RLS 策略（如果需要）

如果启用了 RLS，需要创建策略允许 API 访问：

```sql
-- 启用 RLS（如果需要）
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许服务角色（API）完全访问
CREATE POLICY "Service role can manage devices"
ON devices
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 或者：允许匿名用户（anon key）访问
CREATE POLICY "Anon can manage devices"
ON devices
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
```

**注意**：如果使用 anon key，请确保这是安全的（仅用于开发环境）。

### 方案 5: 测试数据插入

```sql
-- 测试插入数据
INSERT INTO devices (
  device_id, 
  model, 
  address, 
  installer, 
  install_date, 
  status, 
  is_locked
)
VALUES (
  'TEST-DEV-001',
  '智能燃料监控系统 V2.0',
  '测试地址',
  '测试安装员',
  NOW(),
  'online',
  false
)
ON CONFLICT (device_id) DO UPDATE SET
  model = EXCLUDED.model,
  address = EXCLUDED.address,
  installer = EXCLUDED.installer,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 检查插入结果
SELECT * FROM devices WHERE device_id = 'TEST-DEV-001';
```

## 查看服务器日志

在运行 `npm run dev` 的终端中，查找以下日志：

- `[安装API] 开始安装设备: ...`
- `[安装API] 安装数据: ...`
- `[安装API] 设备已存在，更新设备: ...` 或 `[安装API] 设备不存在，创建新设备: ...`
- `[安装API] 设备更新成功: ...` 或 `[安装API] 设备创建成功: ...`
- 任何以 `[安装API]` 开头的错误日志

## 常见错误

### 错误 1: "relation 'devices' does not exist"
- **原因**：表不存在
- **解决**：执行方案 1 创建表

### 错误 2: "column 'xxx' does not exist"
- **原因**：表缺少字段
- **解决**：执行方案 2 添加缺失字段

### 错误 3: "duplicate key value violates unique constraint"
- **原因**：主键冲突
- **解决**：检查是否有重复的 device_id，或执行方案 3 修复主键约束

### 错误 4: "new row violates row-level security policy"
- **原因**：RLS 策略阻止插入
- **解决**：执行方案 4 配置 RLS 策略

### 错误 5: "permission denied for table devices"
- **原因**：API key 没有权限
- **解决**：检查 Supabase 项目设置中的 API keys，确保使用正确的 anon key 或 service_role key

## 下一步

1. 执行上述 SQL 脚本检查和修复表结构
2. 刷新浏览器页面（硬刷新：`Ctrl + Shift + R`）
3. 再次尝试提交安装
4. 查看浏览器控制台和服务器终端的错误日志
5. 如果仍有问题，将错误信息发送给我

