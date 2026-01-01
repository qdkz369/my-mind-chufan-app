# 数据库迁移说明

## 订单表 (orders) 字段更新

为了支持新的业务流程，需要在 Supabase 中更新 `orders` 表，添加以下字段：

### 新增字段

```sql
-- 添加产品类型字段
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS product_type VARCHAR(50);

-- 添加指派配送员ID字段（新字段，优先使用）
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES workers(id);

-- 添加瓶身溯源二维码字段
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_code TEXT;

-- 添加配送图片凭证URL字段
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS proof_image TEXT;

-- 添加客户确认验收字段
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_confirmed BOOLEAN DEFAULT FALSE;

-- 更新状态字段类型（如果需要）
-- 注意：如果 status 字段已存在，确保支持以下状态值：
-- 'pending_install', 'pending_acceptance', 'active', 'processing', 'delivering', 'completed'
```

### 状态字段说明

订单状态流转规则：
- `pending_install` - 待安装（安装员安装设备时创建）
- `pending_acceptance` - 待验收（安装完成后，等待客户确认）
- `active` - 已激活/待下单（客户确认验收后）
- `processing` - 待派单（客户下单后，等待配送员接单）
- `delivering` - 配送中（配送员接单后）
- `completed` - 已完成（配送员完成配送，已扫码和拍照）

### 索引建议

```sql
-- 为常用查询字段添加索引
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_product_type ON orders(product_type);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
```

### 兼容性说明

- `assigned_to` 字段与现有的 `worker_id` 字段功能相同，但 `assigned_to` 是新的标准字段
- 代码中会同时更新两个字段以保持兼容性
- 建议逐步迁移到使用 `assigned_to` 字段

## Supabase Storage 配置

需要在 Supabase 中创建 Storage Bucket 用于存储配送凭证图片：

1. 进入 Supabase Dashboard
2. 导航到 Storage
3. 创建新的 Bucket：`delivery-proofs`
4. 设置权限：
   - Public: 允许读取（用于显示图片）
   - 上传权限：通过 API 控制（使用 Service Role Key）

### Storage 权限设置

```sql
-- 允许公开读取
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'delivery-proofs');

-- 允许通过 API 上传（需要 Service Role Key）
-- 注意：实际权限设置应在 Supabase Dashboard 中完成
```

## 数据迁移脚本（可选）

如果需要将现有订单数据迁移到新状态：

```sql
-- 将现有的 'pending' 状态迁移为 'active'
UPDATE orders 
SET status = 'active' 
WHERE status = 'pending' AND customer_confirmed = FALSE;

-- 将现有的 'delivering' 或 '进行中' 状态迁移为 'delivering'
UPDATE orders 
SET status = 'delivering' 
WHERE status IN ('delivering', '进行中', '配送中');

-- 将现有的 'completed' 或 '已完成' 状态迁移为 'completed'
UPDATE orders 
SET status = 'completed' 
WHERE status IN ('completed', '已完成');
```

