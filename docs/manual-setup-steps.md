# Supabase 手动配置步骤

## 第一步：执行数据库预设脚本

1. **登录 Supabase Dashboard**
   - 访问 https://supabase.com/dashboard
   - 选择您的项目

2. **打开 SQL Editor**
   - 在左侧菜单中点击 **SQL Editor**
   - 点击 **New query**

3. **执行预设脚本**
   - 打开项目中的 `docs/test-data-setup.sql` 文件
   - 复制全部内容
   - 粘贴到 SQL Editor 中
   - 点击 **Run** 执行

4. **验证数据**
   - 执行后，应该看到类似以下输出：
     ```
     type        | count
     ------------+-------
     设备数据     |   3
     测试餐厅     |   1
     测试配送员   |   2
     ```

5. **检查设备数据**
   - 在左侧菜单中点击 **Table Editor**
   - 选择 `devices` 表
   - 确认有以下3条记录：
     - `TEST-DEV-001`
     - `TEST-DEV-002`
     - `TEST-DEV-003`
   - 确认它们的 `status` 字段为 `ready`

## 第二步：创建 Storage Bucket

1. **进入 Storage**
   - 在左侧菜单中点击 **Storage**

2. **创建新 Bucket**
   - 点击 **New bucket** 按钮
   - 填写以下信息：
     - **Name**: `delivery-proofs`
     - **Public bucket**: ✅ **必须勾选**（允许公开读取图片）
     - **File size limit**: `5242880` (5MB)
     - **Allowed MIME types**: `image/jpeg,image/png,image/webp`（可选）

3. **点击 Create** 创建 bucket

4. **验证创建成功**
   - 在 Storage 列表中应该能看到 `delivery-proofs` bucket
   - 状态应该显示为 **Public**

## 第三步：验证配置

### 验证设备数据
在 SQL Editor 中执行：
```sql
SELECT device_id, model, status FROM devices WHERE device_id LIKE 'TEST-DEV-%';
```

应该返回3条记录，所有记录的 `status` 都是 `ready`。

### 验证 Storage Bucket
1. 在 Storage 中点击 `delivery-proofs` bucket
2. 尝试上传一张测试图片
3. 确认可以成功上传并获取公开 URL

## 完成！

配置完成后，您可以：
1. 使用测试设备ID（TEST-DEV-001, TEST-DEV-002, TEST-DEV-003）进行安装测试
2. 使用测试溯源码（BOTTLE-999）进行配送测试
3. 上传图片到 `delivery-proofs` bucket

## 常见问题

### Q: SQL 脚本执行失败
**A**: 检查：
- 表结构是否正确（devices, orders, restaurants 表是否存在）
- 字段是否已存在（如果字段已存在，ALTER TABLE 会报错，可以忽略）

### Q: Bucket 创建失败
**A**: 检查：
- Bucket 名称是否已存在（必须是唯一的）
- 是否有足够的权限

### Q: 图片上传失败
**A**: 检查：
- Bucket 是否已创建
- Bucket 是否设置为 Public
- Storage Policies 是否正确配置

