# 客户注册与安装测试完整指南

## 概述

本指南将帮助您完成以下流程：
1. 模拟手机客户端用户注册
2. 获取新注册客户的二维码（qr_token）
3. 在安装页面使用新客户数据进行测试

## 第一步：注册新客户

### 方法一：通过个人中心页面注册（推荐）

1. **打开应用首页**
   - 在浏览器中访问：`http://localhost:3000`
   - 确保开发服务器正在运行

2. **进入个人中心**
   - 点击底部导航栏的 **"我的"** 按钮
   - 或直接访问：`http://localhost:3000/profile`

3. **填写注册信息**
   - **姓名**：输入您的姓名（例如：张三）
   - **手机号**：输入一个唯一的手机号（例如：13800138001）
   - **餐厅名称**：输入餐厅名称（例如：测试餐厅001）
   - **地址**（可选）：
     - 可以手动输入地址
     - 或点击"精确定位"按钮使用GPS定位自动填充

4. **提交注册**
   - 点击 **"保存"** 或 **"提交"** 按钮
   - 等待注册成功提示

5. **查看注册结果**
   - 注册成功后，系统会：
     - 自动生成一个唯一的 `qr_token`（32位十六进制字符串）
     - 将 `restaurantId` 保存到浏览器的 `localStorage`
     - 显示成功提示

### 方法二：通过API直接注册（开发者）

如果您是开发者，也可以使用 API 直接注册：

```bash
curl -X POST http://localhost:3000/api/restaurant/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "phone": "13800138001",
    "restaurant_name": "测试餐厅001",
    "address": "昆明市五华区测试路001号"
  }'
```

## 第二步：获取新客户的二维码（qr_token）

注册成功后，有几种方式获取 `qr_token`：

### 方法一：通过浏览器控制台查看（最简单）

1. **打开浏览器开发者工具**
   - 按 `F12` 或右键点击页面选择"检查"
   - 切换到 **Console**（控制台）标签

2. **查看注册日志**
   - 注册成功后，控制台会显示类似以下信息：
   ```
   [注册API] 插入成功，返回数据: {
     id: "xxx-xxx-xxx",
     name: "测试餐厅001",
     qr_token: "abc123def456...",
     ...
   }
   ```
   - 复制 `qr_token` 的值

### 方法二：通过首页二维码查看

1. **返回首页**
   - 点击底部导航栏的 **"首页"** 按钮
   - 或访问：`http://localhost:3000`

2. **点击二维码图标**
   - 在页面右上角，点击绿色的二维码图标
   - 会弹出一个二维码弹窗

3. **查看二维码内容**
   - 二维码下方会显示 `qr_token` 的值
   - 或者扫描二维码，内容就是 `qr_token`

### 方法三：通过 Supabase Dashboard 查询

1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择您的项目

2. **打开 Table Editor**
   - 点击左侧菜单的 **Table Editor**
   - 选择 `restaurants` 表

3. **查找新注册的餐厅**
   - 按 `contact_phone` 或 `name` 搜索
   - 找到对应的记录
   - 查看 `qr_token` 字段的值

### 方法四：通过 SQL 查询

在 Supabase SQL Editor 中执行：

```sql
SELECT id, name, contact_name, contact_phone, qr_token, address, status
FROM restaurants
WHERE contact_phone = '13800138001'  -- 替换为您注册时使用的手机号
ORDER BY created_at DESC
LIMIT 1;
```

## 第三步：在安装页面使用新客户数据

### 步骤 1：打开安装页面

1. **访问安装页面**
   - 在浏览器中访问：`http://localhost:3000/worker`
   - 或从首页导航到"服务端工作台"

2. **进入设备安装**
   - 点击 **"设备安装"** 按钮

### 步骤 2：使用新客户的二维码

1. **第一步：扫描客户码**
   - 在"第一步：扫描客户码"区域
   - 有两种方式：
   
   **方式A：手动输入 qr_token**
   - 在输入框中粘贴刚才获取的 `qr_token`
   - 按 `Enter` 键或点击"模拟获取"按钮
   
   **方式B：使用二维码扫描**
   - 点击二维码图标
   - 使用摄像头扫描首页显示的二维码
   - 或扫描二维码图片

2. **验证客户信息**
   - 系统会自动获取客户信息
   - 应该看到：
     - ✅ "自动识别成功：测试餐厅001"（或您注册的餐厅名称）
     - ✅ 安装地址自动填充

3. **第二步：添加设备**
   - 在"第二步：待绑定设备清单"区域
   - 输入设备ID（例如：TEST-DEV-001）
   - 选择设备型号
   - 点击"添加"按钮
   - 可以添加多个设备

4. **填写安装人姓名**
   - 输入安装人员的姓名

5. **提交安装**
   - 点击 **"确认安装完成"** 按钮
   - 系统会批量绑定所有设备到该客户

## 验证安装结果

### 方法一：在 Supabase 中验证

执行以下 SQL 查询：

```sql
-- 查看设备是否已关联到客户
SELECT 
  d.device_id,
  d.model,
  d.restaurant_id,
  r.name as restaurant_name,
  r.qr_token
FROM devices d
LEFT JOIN restaurants r ON d.restaurant_id = r.id
WHERE d.device_id LIKE 'TEST-DEV-%'
ORDER BY d.updated_at DESC;
```

### 方法二：在安装页面验证

1. 刷新安装页面
2. 再次使用相同的 `qr_token` 获取客户信息
3. 应该能看到已绑定的设备列表

## 常见问题

### Q1: 注册后找不到 qr_token？

**A:** 请检查：
1. 浏览器控制台是否有错误信息
2. 注册是否真的成功（查看成功提示）
3. 尝试刷新页面后再次查看

### Q2: 使用 qr_token 时提示"餐厅不存在"？

**A:** 可能的原因：
1. `qr_token` 复制不完整（应该是32位十六进制字符串）
2. 数据库中确实没有该记录（注册可能失败）
3. 使用了错误的 `qr_token`

**解决方法：**
- 在 Supabase 中查询确认 `qr_token` 是否正确
- 重新注册一个新客户

### Q3: 如何查看 localStorage 中的 restaurantId？

**A:** 在浏览器控制台执行：
```javascript
console.log('Restaurant ID:', localStorage.getItem('restaurantId'))
```

### Q4: 如何清除注册信息重新测试？

**A:** 在浏览器控制台执行：
```javascript
localStorage.removeItem('restaurantId')
location.reload()
```

## 完整测试流程示例

1. ✅ **注册新客户**
   - 访问 `/profile`
   - 填写：姓名=张三，手机=13800138001，餐厅=测试餐厅001
   - 提交注册

2. ✅ **获取 qr_token**
   - 在控制台查看或从 Supabase 查询
   - 例如：`qr_token = "a1b2c3d4e5f6..."`

3. ✅ **测试安装功能**
   - 访问 `/worker` → 设备安装
   - 输入 `qr_token` → 获取客户信息
   - 添加设备 → 提交安装

4. ✅ **验证结果**
   - 在 Supabase 中查询设备是否已关联

## 提示

- 每次注册都会生成一个新的唯一 `qr_token`
- `qr_token` 是32位十六进制字符串，用于唯一标识客户
- 同一个手机号重复注册会更新现有记录，不会创建新记录
- 建议使用不同的手机号进行多次测试

