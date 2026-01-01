# Supabase Storage 配置指南

## 创建 Storage Bucket

### 步骤 1：登录 Supabase Dashboard
1. 访问 https://supabase.com/dashboard
2. 选择您的项目

### 步骤 2：创建 Bucket
1. 在左侧菜单中，点击 **Storage**
2. 点击 **New bucket** 按钮
3. 填写以下信息：
   - **Name**: `delivery-proofs`
   - **Public bucket**: ✅ **勾选**（允许公开读取图片）
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp`（可选，用于限制文件类型）

### 步骤 3：设置权限（可选）
如果需要更细粒度的权限控制：

1. 点击 `delivery-proofs` bucket
2. 进入 **Policies** 标签
3. 创建策略：

**读取策略（公开访问）**：
```sql
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'delivery-proofs');
```

**上传策略（通过 API）**：
```sql
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'delivery-proofs' AND
  auth.role() = 'authenticated'
);
```

### 步骤 4：验证配置
上传一张测试图片，确认：
- ✅ 图片可以成功上传
- ✅ 可以获取公开 URL
- ✅ 图片可以在浏览器中访问

## 测试上传

可以使用以下方式测试：

1. **通过 API 测试**：
```bash
curl -X POST http://localhost:3000/api/storage/upload \
  -F "file=@test-image.jpg" \
  -F "folder=delivery-proofs"
```

2. **通过前端测试**：
   - 访问配送员页面
   - 选择订单
   - 点击"拍照或选择图片"
   - 选择一张图片
   - 确认上传成功并显示预览

## 故障排查

### 错误：Bucket not found
**解决方案**：按照上述步骤创建 `delivery-proofs` bucket

### 错误：Permission denied
**解决方案**：
1. 检查 bucket 是否为 Public
2. 检查 Storage Policies 是否正确配置
3. 确认使用的是正确的 API Key（ANON_KEY 用于公开访问，SERVICE_ROLE_KEY 用于上传）

### 错误：File size too large
**解决方案**：
1. 检查文件大小是否超过 5MB
2. 在 bucket 设置中调整文件大小限制

### 图片无法访问
**解决方案**：
1. 确认 bucket 设置为 Public
2. 检查 URL 是否正确
3. 在 Supabase Dashboard 中查看文件是否已上传

