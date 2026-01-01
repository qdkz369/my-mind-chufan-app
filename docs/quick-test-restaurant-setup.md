# 快速创建测试餐厅数据

## 问题说明

如果点击"模拟获取"按钮提示"无效的二维码：餐厅不存在"，说明数据库中还没有测试餐厅数据。

## 解决方案

### 方法一：在 Supabase Dashboard 中执行 SQL（推荐）

1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择您的项目

2. **打开 SQL Editor**
   - 点击左侧菜单的 **SQL Editor**
   - 点击 **New query** 创建新查询

3. **执行以下 SQL 语句**

```sql
-- 创建测试餐厅（如果不存在）
INSERT INTO restaurants (id, name, contact_name, contact_phone, address, status, qr_token, total_refilled)
VALUES 
  (
    gen_random_uuid(),
    '测试餐厅001',
    '测试负责人',
    '13800138001',
    '昆明市五华区测试路001号',
    'active',
    'test_qr_token_001',
    0
  )
ON CONFLICT (qr_token) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  status = 'active';

-- 验证数据是否创建成功
SELECT id, name, address, qr_token, status 
FROM restaurants 
WHERE qr_token = 'test_qr_token_001';
```

4. **点击 Run** 执行 SQL

5. **验证结果**
   - 应该看到一条查询结果，显示测试餐厅的信息
   - 如果看到结果，说明数据创建成功

### 方法二：使用 Table Editor 手动创建

1. **打开 Table Editor**
   - 在 Supabase Dashboard 中，点击左侧菜单的 **Table Editor**
   - 选择 `restaurants` 表

2. **点击 "Insert row" 按钮**

3. **填写以下字段：**
   - `id`: 留空（会自动生成 UUID）
   - `name`: `测试餐厅001`
   - `contact_name`: `测试负责人`
   - `contact_phone`: `13800138001`
   - `address`: `昆明市五华区测试路001号`
   - `status`: `active`
   - `qr_token`: `test_qr_token_001` ⚠️ **这个很重要！**
   - `total_refilled`: `0`

4. **点击 Save** 保存

### 方法三：使用完整的测试数据脚本

如果需要完整的测试数据（包括设备、餐厅、配送员等），请执行 `docs/test-data-setup.sql` 文件中的完整脚本。

## 验证

创建数据后，回到应用页面：

1. 刷新浏览器页面
2. 点击"设备安装"
3. 点击"模拟获取"按钮
4. 应该能成功获取客户信息并自动填充地址

## 常见问题

### Q: 执行 SQL 后仍然提示"餐厅不存在"？

**A:** 请检查：
1. `qr_token` 字段的值是否完全匹配 `test_qr_token_001`（注意大小写和空格）
2. 是否在正确的项目中执行了 SQL
3. 刷新浏览器页面后重试

### Q: 如何查看数据库中已有的餐厅？

**A:** 在 Supabase SQL Editor 中执行：
```sql
SELECT id, name, address, qr_token, status 
FROM restaurants 
ORDER BY created_at DESC 
LIMIT 10;
```

### Q: 可以使用其他 qr_token 吗？

**A:** 可以！修改代码中的 `mockQrToken` 值即可：
- 在 `app/worker/page.tsx` 中找到 `handleMockCustomerInfo` 函数
- 将 `const mockQrToken = "test_qr_token_001"` 改为您数据库中的实际 `qr_token`

