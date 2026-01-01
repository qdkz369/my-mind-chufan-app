# 业务流程实现总结

## 已完成功能

### 1. 订单状态机和类型定义 ✅
- 文件：`lib/types/order.ts`
- 定义了完整的订单状态流转规则
- 支持产品类型枚举（液化气、甲醇、热能清洁燃料、户外环保燃料）

### 2. 订单API更新 ✅
- `app/api/orders/create/route.ts` - 支持新字段和状态
- `app/api/orders/accept/route.ts` - 客户确认验收
- `app/api/orders/dispatch/route.ts` - 配送员接单
- `app/api/orders/complete/route.ts` - 完成配送（需要扫码和拍照）
- `app/api/orders/pending/route.ts` - 获取待接单订单列表

### 3. 客户页面 ✅
- `app/customer/confirm/page.tsx` - 客户确认验收页面
- `app/customer/order/page.tsx` - 客户下单页面（支持产品类型选择）

### 4. 配送员功能 ✅
- `components/worker/order-list.tsx` - 订单列表组件（支持按产品类型筛选）
- `components/worker/qr-scanner.tsx` - 二维码扫描组件（使用 html5-qrcode）
- `components/worker/image-uploader.tsx` - 图片上传组件（支持 Supabase Storage）
- `app/worker/page.tsx` - 重构配送表单，支持订单配送流程

### 5. 图片上传API ✅
- `app/api/storage/upload/route.ts` - Supabase Storage 图片上传接口

### 6. 安装流程更新 ✅
- 安装设备后自动创建订单，状态设为 `pending_acceptance`
- 客户确认验收后，订单状态转为 `active`

## 业务流程

### 完整流程

1. **安装员环节**
   - 安装设备并绑定到餐厅
   - 系统自动创建订单，状态为 `pending_acceptance`
   - 客户收到通知

2. **客户环节**
   - 访问 `/customer/confirm?order_id=xxx` 确认验收
   - 订单状态转为 `active`（已激活/待下单）
   - 访问 `/customer/order` 创建新订单，选择产品类型
   - 订单创建后状态为 `active` 或 `processing`（如果有配送员）

3. **派单逻辑**
   - 系统根据订单的 `product_type` 筛选订单
   - 配送员在"待接单订单"列表中看到对应类型的订单
   - 配送员可以按产品类型筛选订单

4. **配送员环节**
   - 查看待接单订单列表
   - 点击"接单"按钮，订单状态转为 `delivering`
   - 进入配送证明步骤：
     - **扫码**：扫描瓶身溯源二维码（使用 html5-qrcode）
     - **拍照**：上传配送凭证图片（上传到 Supabase Storage）
   - 点击"完成配送"，订单状态转为 `completed`

## 技术实现

### 扫码功能
- 使用 `html5-qrcode` 库
- 支持调用设备摄像头
- 自动识别二维码内容
- 支持手动输入作为备选

### 图片上传
- 上传到 Supabase Storage
- 支持预览和删除
- 文件大小限制：5MB
- 支持格式：JPG、PNG

### 状态流转验证
- 使用 `canTransitionOrderStatus` 函数验证状态流转
- 防止非法状态转换
- 确保业务流程的正确性

## 待配置项

1. **Supabase 数据库**
   - 执行 `docs/database-migration.md` 中的 SQL 语句
   - 创建 Storage Bucket：`delivery-proofs`

2. **环境变量**
   - 确保 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已配置
   - Supabase Storage 需要 Service Role Key（用于上传，在 API 路由中使用）

3. **配送员ID管理**
   - 当前使用 localStorage 存储 `workerId`
   - 建议实现配送员登录功能，从数据库获取真实的 worker_id

## 使用说明

### 客户确认验收
1. 访问 `/customer/confirm?order_id=订单ID`
2. 查看安装信息和设备信息
3. 点击"确认验收"按钮

### 客户下单
1. 访问 `/customer/order`
2. 选择产品类型（液化气、甲醇等）
3. 输入数量
4. 点击"创建订单"

### 配送员接单和配送
1. 访问 `/worker` 页面
2. 点击"待接单订单"
3. 选择要配送的订单
4. 扫描瓶身溯源二维码
5. 上传配送凭证图片
6. 点击"完成配送"

## 注意事项

1. **数据库迁移**：需要先执行数据库迁移脚本，添加新字段
2. **Storage 配置**：需要创建 `delivery-proofs` bucket 并设置权限
3. **摄像头权限**：扫码功能需要浏览器摄像头权限
4. **兼容性**：代码同时支持 `assigned_to` 和 `worker_id` 字段，保持向后兼容

