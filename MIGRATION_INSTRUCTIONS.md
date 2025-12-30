# 数据库迁移执行说明

## 迁移脚本文件
`database-migration-restaurant-management.sql`

## 执行步骤

### 方法 1：通过 Supabase Dashboard 执行（推荐）

1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击左侧菜单的 **SQL Editor**
4. 点击 **New Query**
5. 复制 `database-migration-restaurant-management.sql` 文件的全部内容
6. 粘贴到 SQL Editor 中
7. 点击 **Run** 执行脚本

### 方法 2：通过 psql 命令行执行

```bash
# 连接到 Supabase 数据库
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f database-migration-restaurant-management.sql
```

### 方法 3：通过 Supabase CLI 执行

```bash
# 如果已安装 Supabase CLI
supabase db push database-migration-restaurant-management.sql
```

## 迁移内容

### 1. 创建 restaurants 表
- `id` (UUID, 主键)
- `name` (文本，餐厅名称)
- `address` (文本)
- `qr_token` (文本，唯一，用于客户端 APP 生成身份码)
- `total_refilled` (数字，初始为 0，累计加注量)
- `created_at`, `updated_at` (时间戳)

### 2. 修改 devices 表
- 添加 `restaurant_id` (UUID，关联到 restaurants.id)
- 添加 `container_type` (文本，枚举值：'fixed_tank' 或 'cylinder')
- 添加 `tank_capacity` (数字，单位：kg 或 L)
- 确保 `last_cylinder_id` 字段存在

### 3. 创建 gas_cylinders 表
- `id` (文本，主键，钢瓶身份码)
- `manufacturer` (文本)
- `production_date` (日期)
- `capacity` (数字)
- `status` (文本：'in_use', 'empty', 'refilling')

### 4. 创建/更新 filling_logs 表
- `id` (BIGSERIAL, 主键)
- `device_id` (文本)
- `restaurant_id` (UUID)
- `delivery_person` (文本，执行人姓名)
- `operation_type` (文本：'refill' 或 'cylinder_change')
- `fuel_amount_liters` (数字，加注量)
- `cylinder_id` (文本，钢瓶号)
- `executed_at` (时间戳)
- `location_address` (文本)
- `fuel_batch_id` (文本)

## 注意事项

1. **数据迁移**：如果 `filling_logs` 表已存在且 `restaurant_id` 是 TEXT 类型，脚本会尝试将其转换为 UUID。如果转换失败，需要手动处理数据迁移。

2. **外键约束**：脚本中的外键约束已被注释，如需启用，请先确保数据完整性，然后取消注释相关代码。

3. **实时订阅**：如需启用实时订阅，请取消注释脚本末尾的相关代码。

4. **现有数据**：如果 `restaurants` 表已存在但使用不同的主键类型（如 TEXT），需要先迁移现有数据。

## 验证迁移

执行脚本后，可以通过以下 SQL 验证：

```sql
-- 检查 restaurants 表
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'restaurants';

-- 检查 devices 表的新字段
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'devices' 
AND column_name IN ('restaurant_id', 'container_type', 'tank_capacity');

-- 检查 gas_cylinders 表
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'gas_cylinders';

-- 检查 filling_logs 表
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'filling_logs';
```

## 后续操作

1. 更新现有数据：为 `devices` 表中的设备分配 `restaurant_id`
2. 创建餐厅记录：在 `restaurants` 表中创建餐厅数据
3. 生成二维码：为每个餐厅生成唯一的 `qr_token`
4. 测试 API：确保 `/api/filling` 和 `/api/restaurant` 接口正常工作

