# 数据库迁移执行指南

## 📋 迁移脚本
**文件**: `database-migration-restaurant-management.sql`

## 🚀 执行方法

### 方法 1：Supabase Dashboard（推荐）

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 点击左侧菜单 **SQL Editor**
4. 点击 **New Query** 按钮
5. 复制 `database-migration-restaurant-management.sql` 的全部内容
6. 粘贴到编辑器中
7. 点击 **Run** 或按 `Ctrl+Enter` 执行

### 方法 2：psql 命令行

```bash
# 替换以下变量：
# - [YOUR-PASSWORD]: 你的数据库密码
# - [YOUR-PROJECT-REF]: 你的项目引用ID

psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f database-migration-restaurant-management.sql
```

### 方法 3：Supabase CLI

```bash
# 如果已安装 Supabase CLI
supabase db push database-migration-restaurant-management.sql
```

## 📊 迁移内容概览

### ✅ 1. restaurants 表（新建）
- `id` (UUID, 主键) - 自动生成
- `name` (TEXT) - 餐厅名称
- `address` (TEXT) - 地址
- `qr_token` (TEXT, UNIQUE) - 二维码令牌
- `total_refilled` (NUMERIC) - 累计加注量，默认 0
- `created_at`, `updated_at` - 时间戳

### ✅ 2. devices 表（修改）
- 添加 `restaurant_id` (UUID) - 关联到 restaurants.id
- 添加 `container_type` (TEXT) - 'fixed_tank' 或 'cylinder'
- 添加 `tank_capacity` (NUMERIC) - 油箱/钢瓶容量
- 确保 `last_cylinder_id` (TEXT) 存在

### ✅ 3. gas_cylinders 表（新建）
- `id` (TEXT, 主键) - 钢瓶身份码
- `manufacturer` (TEXT) - 制造商
- `production_date` (DATE) - 生产日期
- `capacity` (NUMERIC) - 容量
- `status` (TEXT) - 'in_use', 'empty', 'refilling'

### ✅ 4. filling_logs 表（新建/更新）
- `id` (BIGSERIAL, 主键)
- `device_id` (TEXT)
- `restaurant_id` (UUID)
- `delivery_person` (TEXT) - 执行人姓名
- `operation_type` (TEXT) - 'refill' 或 'cylinder_change'
- `fuel_amount_liters` (NUMERIC) - 加注量
- `cylinder_id` (TEXT) - 钢瓶号
- `executed_at` (TIMESTAMP) - 执行时间
- `location_address` (TEXT)
- `fuel_batch_id` (TEXT)

## ⚠️ 重要注意事项

### 数据迁移
如果 `filling_logs` 表已存在且 `restaurant_id` 是 TEXT 类型：
- 脚本会尝试将其转换为 UUID
- 如果转换失败，需要手动迁移数据
- 建议先备份数据

### 外键约束
- 脚本中的外键约束已被注释
- 如需启用，请先确保数据完整性
- 然后取消注释相关代码

### 现有数据
如果 `restaurants` 表已存在但使用不同的主键：
- 需要先迁移现有数据
- 或创建新的 restaurants 表并迁移数据

## ✅ 验证迁移

执行脚本后，运行以下 SQL 验证：

```sql
-- 1. 检查 restaurants 表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'restaurants'
ORDER BY ordinal_position;

-- 2. 检查 devices 表的新字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'devices' 
AND column_name IN ('restaurant_id', 'container_type', 'tank_capacity', 'last_cylinder_id');

-- 3. 检查 gas_cylinders 表
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gas_cylinders'
ORDER BY ordinal_position;

-- 4. 检查 filling_logs 表
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'filling_logs'
ORDER BY ordinal_position;

-- 5. 检查索引
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('restaurants', 'devices', 'gas_cylinders', 'filling_logs');
```

## 📝 后续操作

### 1. 创建测试餐厅数据
```sql
INSERT INTO restaurants (name, address, qr_token)
VALUES 
  ('测试餐厅1', '昆明市五华区测试路123号', 'TEST_REST_001'),
  ('测试餐厅2', '昆明市盘龙区测试路456号', 'TEST_REST_002');
```

### 2. 更新设备数据
```sql
-- 为现有设备分配餐厅
UPDATE devices 
SET restaurant_id = (SELECT id FROM restaurants WHERE qr_token = 'TEST_REST_001' LIMIT 1),
    container_type = 'cylinder',
    tank_capacity = 50
WHERE device_id = 'YOUR_DEVICE_ID';
```

### 3. 创建测试钢瓶数据
```sql
INSERT INTO gas_cylinders (id, manufacturer, production_date, capacity, status)
VALUES 
  ('CYL001', 'XX制造厂', '2024-01-01', 50, 'empty'),
  ('CYL002', 'XX制造厂', '2024-01-15', 50, 'empty');
```

### 4. 测试 API
- 测试 `/api/restaurant?qr_token=TEST_REST_001`
- 测试 `/api/filling` POST 请求
- 验证数据是否正确保存

## 🔧 故障排除

### 问题 1: 外键约束错误
**解决**: 确保所有 `restaurant_id` 值都存在于 `restaurants.id` 中

### 问题 2: UUID 转换失败
**解决**: 手动迁移数据，将 TEXT 类型的 restaurant_id 映射到 UUID

### 问题 3: 表已存在错误
**解决**: 脚本使用 `IF NOT EXISTS`，不会重复创建表

## 📞 支持
如有问题，请检查：
1. Supabase 连接是否正常
2. 数据库权限是否足够
3. 表结构是否符合预期

