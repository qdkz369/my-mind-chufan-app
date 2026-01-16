# 4. API 路由参考 (API Routes Reference) - 第二部分

**生成时间**：2025-01-20  
**文档版本**：v1.0

---

## 四、业务 API（业务操作）

### 4.1 订单业务 API

#### 创建订单 API

**路由**：`POST /api/orders/create`

**文件位置**：`app/api/orders/create/route.ts`

**功能**：
- 创建燃料配送订单
- 支持多种产品类型（lpg、methanol、clean_fuel、outdoor_fuel）

**请求体**：
```typescript
{
  restaurant_id: string
  product_type: 'lpg' | 'methanol' | 'clean_fuel' | 'outdoor_fuel'
  amount?: number
  // ... 其他订单信息
}
```

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    order_id: string
    // ... 其他订单信息
  }
  error?: string
}
```

**权限要求**：
- 餐厅用户：只能为自己的餐厅创建订单
- 管理员：可以为任何餐厅创建订单（通过 `company_id` 过滤）

**错误处理**：
- 使用 `logBusinessWarning` 记录业务警告（B 类错误）

---

#### 订单状态更新 API

**路由**：
- `POST /api/orders/accept`：接单
- `POST /api/orders/dispatch`：派单
- `POST /api/orders/complete`：完成订单
- `POST /api/orders/reject`：拒绝订单
- `POST /api/orders/exception`：异常订单

**文件位置**：
- `app/api/orders/accept/route.ts`
- `app/api/orders/dispatch/route.ts`
- `app/api/orders/complete/route.ts`
- `app/api/orders/reject/route.ts`
- `app/api/orders/exception/route.ts`

**功能**：
- 更新订单状态
- 记录状态变更日志（`status_change_logs` 表）
- 记录审计日志（`audit_logs` 表）

**权限要求**：
- 配送员：只能更新分配给自己的订单
- 管理员：可以更新所有订单（通过 `company_id` 过滤）

**错误处理**：
- 使用 `logBusinessWarning` 记录业务警告（B 类错误）

---

#### 待接单列表 API

**路由**：`GET /api/orders/pending`

**文件位置**：`app/api/orders/pending/route.ts`

**功能**：
- 获取待接单的订单列表
- 支持按产品类型筛选
- 支持按餐厅筛选

**查询参数**：
- `product_type`：产品类型（可选）
- `restaurant_id`：餐厅ID（可选）
- `page`：页码（可选）
- `limit`：每页数量（可选）

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    orders: Array<{
      id: string
      restaurant_id: string
      product_type: string
      status: string
      // ... 其他订单信息
    }>
    total: number
    page: number
    limit: number
  }
  error?: string
}
```

**权限要求**：
- 配送员：可以查看所有待接单订单（按产品类型筛选）
- 管理员：可以查看所有待接单订单（通过 `company_id` 过滤）

---

### 4.2 报修业务 API

#### 创建报修工单 API

**路由**：`POST /api/repair/create`

**文件位置**：`app/api/repair/create/route.ts`

**功能**：
- 创建报修工单
- 支持语音录音上传
- 支持多种服务类型（维修服务、清洁服务、工程改造）

**请求体**：
```typescript
{
  restaurant_id: string
  service_type: '维修服务' | '清洁服务' | '工程改造'
  description?: string
  audio_url?: string
  device_id?: string
  urgency?: 'low' | 'medium' | 'high'
}
```

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    repair_order_id: string
    // ... 其他工单信息
  }
  error?: string
}
```

**权限要求**：
- 餐厅用户：只能为自己的餐厅创建报修工单
- 管理员：可以为任何餐厅创建报修工单（通过 `company_id` 过滤）

**错误处理**：
- 使用 `logBusinessWarning` 记录业务警告（B 类错误）

---

#### 报修工单列表 API

**路由**：`GET /api/repair/list`

**文件位置**：`app/api/repair/list/route.ts`

**功能**：
- 获取报修工单列表
- 支持按状态筛选
- 支持按服务类型筛选

**查询参数**：
- `restaurant_id`：餐厅ID（可选）
- `status`：状态（可选）
- `service_type`：服务类型（可选）
- `page`：页码（可选）
- `limit`：每页数量（可选）

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    repair_orders: Array<{
      id: string
      restaurant_id: string
      service_type: string
      status: string
      // ... 其他工单信息
    }>
    total: number
    page: number
    limit: number
  }
  error?: string
}
```

**权限要求**：
- 餐厅用户：只能查看自己餐厅的报修工单
- 维修工：只能查看分配给自己的报修工单
- 管理员：可以查看所有报修工单（通过 `company_id` 过滤）

---

#### 更新报修工单 API

**路由**：`POST /api/repair/update`

**文件位置**：`app/api/repair/update/route.ts`

**功能**：
- 更新报修工单状态
- 更新工单信息（描述、金额等）
- 记录状态变更日志

**请求体**：
```typescript
{
  repair_order_id: string
  status?: string
  description?: string
  amount?: number
  // ... 其他更新字段
}
```

**权限要求**：
- 维修工：只能更新分配给自己的报修工单
- 管理员：可以更新所有报修工单（通过 `company_id` 过滤）

---

#### 上传语音录音 API

**路由**：`POST /api/repair/upload-audio`

**文件位置**：`app/api/repair/upload-audio/route.ts`

**功能**：
- 上传报修语音录音文件
- 返回录音文件URL

**请求体**：
```typescript
FormData {
  audio: File
  repair_order_id?: string
}
```

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    audio_url: string
  }
  error?: string
}
```

**权限要求**：
- 餐厅用户：可以上传语音录音
- 管理员：可以上传语音录音

---

### 4.3 支付业务 API

#### 创建支付 API

**路由**：`POST /api/payment/alipay/create`

**文件位置**：`app/api/payment/alipay/create/route.ts`

**功能**：
- 创建支付宝支付订单
- 支持多种订单类型（delivery_orders、repair_orders）

**请求体**：
```typescript
{
  order_id: string
  order_type: 'delivery_order' | 'repair_order'
  amount: number
  // ... 其他支付信息
}
```

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    payment_url: string
    payment_id: string
    // ... 其他支付信息
  }
  error?: string
}
```

**权限要求**：
- 餐厅用户：只能为自己的订单创建支付
- 管理员：可以为任何订单创建支付（通过 `company_id` 过滤）

**错误处理**：
- 使用 `logBusinessWarning` 记录业务警告（B 类错误）

---

#### 支付宝回调 API

**路由**：`POST /api/payment/alipay/notify`

**文件位置**：`app/api/payment/alipay/notify/route.ts`

**功能**：
- 接收支付宝支付回调
- 验证支付签名
- 更新订单支付状态

**请求体**：
```typescript
{
  // 支付宝回调参数
  out_trade_no: string
  trade_status: string
  // ... 其他回调参数
}
```

**权限要求**：
- 公开API（无需登录，但需验证签名）

**安全要求**：
- 必须验证支付宝签名
- 必须验证订单状态
- 必须防止重复处理

---

### 4.4 设备租赁业务 API

#### 设备列表 API

**路由**：`GET /api/equipment/list`

**文件位置**：`app/api/equipment/list/route.ts`

**功能**：
- 获取设备列表
- 支持按分类筛选
- 支持按状态筛选

**查询参数**：
- `category_id`：分类ID（可选）
- `status`：状态（可选）
- `page`：页码（可选）
- `limit`：每页数量（可选）

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    equipment: Array<{
      id: string
      name: string
      category_id: string
      status: string
      // ... 其他设备信息
    }>
    total: number
    page: number
    limit: number
  }
  error?: string
}
```

**权限要求**：
- 所有用户：可以查看设备列表（公开数据）

---

#### 设备分类 API

**路由**：`GET /api/equipment/categories`

**文件位置**：`app/api/equipment/categories/route.ts`

**功能**：
- 获取设备分类列表

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    categories: Array<{
      id: string
      name: string
      description?: string
    }>
  }
  error?: string
}
```

**权限要求**：
- 所有用户：可以查看设备分类（公开数据）

---

#### 创建租赁订单 API

**路由**：`POST /api/equipment/rental/create`

**文件位置**：`app/api/equipment/rental/create/route.ts`

**功能**：
- 创建设备租赁订单
- 支持多种计费模式（固定费用、按使用量计费、混合模式）

**请求体**：
```typescript
{
  equipment_id: string
  restaurant_id: string
  start_date: string
  end_date?: string
  monthly_rental_price?: number
  deposit_amount?: number
  // ... 其他租赁信息
}
```

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    rental_order_id: string
    // ... 其他租赁订单信息
  }
  error?: string
}
```

**权限要求**：
- 餐厅用户：只能为自己的餐厅创建租赁订单
- 管理员：可以为任何餐厅创建租赁订单（通过 `company_id` 过滤）

**错误处理**：
- 使用 `logBusinessWarning` 记录业务警告（B 类错误）

---

#### 租赁订单列表 API

**路由**：`GET /api/equipment/rental/list`

**文件位置**：`app/api/equipment/rental/list/route.ts`

**功能**：
- 获取租赁订单列表
- 支持按状态筛选
- 支持按餐厅筛选

**查询参数**：
- `restaurant_id`：餐厅ID（可选）
- `status`：状态（可选）
- `page`：页码（可选）
- `limit`：每页数量（可选）

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    rental_orders: Array<{
      id: string
      equipment_id: string
      restaurant_id: string
      status: string
      // ... 其他租赁订单信息
    }>
    total: number
    page: number
    limit: number
  }
  error?: string
}
```

**权限要求**：
- 餐厅用户：只能查看自己餐厅的租赁订单
- 管理员：可以查看所有租赁订单（通过 `company_id` 过滤）

---

#### 管理员租赁订单列表 API

**路由**：`GET /api/equipment/rental/admin/list`

**文件位置**：`app/api/equipment/rental/admin/list/route.ts`

**功能**：
- 获取所有租赁订单列表（管理员视图）
- 支持按供应商筛选
- 支持按状态筛选

**权限要求**：
- 管理员：必须通过 `getUserContext` 验证 `companyId`

**错误处理**：
- 使用 `logBusinessWarning` 记录业务警告（B 类错误）

---

#### 设备产品目录 API

**路由**：
- `GET /api/equipment/catalog/list`：获取产品目录列表
- `POST /api/equipment/catalog/create`：创建产品目录
- `POST /api/equipment/catalog/approve`：审核产品目录

**文件位置**：
- `app/api/equipment/catalog/list/route.ts`
- `app/api/equipment/catalog/create/route.ts`
- `app/api/equipment/catalog/approve/route.ts`

**功能**：
- 供应商上传产品目录
- 管理员审核产品目录
- 审核通过后可以创建 `equipment` 记录

**权限要求**：
- 供应商：可以创建和查看自己的产品目录
- 管理员：可以审核所有产品目录（通过 `company_id` 过滤）

---

### 4.5 管理员 API

#### 创建供应商 API

**路由**：`POST /api/admin/create-company`

**文件位置**：`app/api/admin/create-company/route.ts`

**功能**：
- 创建供应商公司（租户）
- 初始化多租户数据隔离

**请求体**：
```typescript
{
  name: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  business_license?: string
}
```

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    company_id: string
    // ... 其他公司信息
  }
  error?: string
}
```

**权限要求**：
- 超级管理员（`super_admin`）：必须通过 `getUserContext` 验证

**错误处理**：
- 使用 `logBusinessWarning` 记录业务警告（B 类错误）

---

#### 查找用户 API

**路由**：`GET /api/admin/find-user`

**文件位置**：`app/api/admin/find-user/route.ts`

**功能**：
- 查找用户信息（管理员工具）
- 支持按邮箱、ID、角色筛选

**查询参数**：
- `email`：邮箱（可选）
- `user_id`：用户ID（可选）
- `role`：角色（可选）

**权限要求**：
- 系统级权限（`SYSTEM_LEVEL`）：必须通过 `getUserContext` 验证

---

### 4.6 工人端 API

#### 工人登录 API

**路由**：`POST /api/worker/login`

**文件位置**：`app/api/worker/login/route.ts`

**功能**：
- 工人登录（配送员、维修工、安装工）
- 支持多种工人类型

**请求体**：
```typescript
{
  phone: string
  password?: string
  worker_type?: 'delivery' | 'repair' | 'install' | 'mixed'
}
```

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    worker_id: string
    token?: string
    // ... 其他工人信息
  }
  error?: string
}
```

**权限要求**：
- 公开API（无需登录，但需验证工人身份）

---

#### 检查表结构 API

**路由**：`GET /api/worker/check-table`

**文件位置**：`app/api/worker/check-table/route.ts`

**功能**：
- 检查数据库表结构（测试/工具API）
- 用于调试和开发

**权限要求**：
- 公开API（测试用途）

---

### 4.7 其他业务 API

#### 餐厅注册 API

**路由**：`POST /api/restaurant/register`

**文件位置**：`app/api/restaurant/register/route.ts`

**功能**：
- 餐厅注册
- 创建餐厅账户

**权限要求**：
- 公开API（无需登录）

---

#### 餐厅登录 API

**路由**：`POST /api/restaurant/login`

**文件位置**：`app/api/restaurant/login/route.ts`

**功能**：
- 餐厅登录
- 返回餐厅信息和token

**权限要求**：
- 公开API（无需登录，但需验证餐厅身份）

---

#### 生成二维码令牌 API

**路由**：`POST /api/restaurant/generate-token`

**文件位置**：`app/api/restaurant/generate-token/route.ts`

**功能**：
- 为餐厅生成二维码令牌
- 用于设备绑定和扫码登录

**权限要求**：
- 餐厅用户：只能为自己的餐厅生成令牌
- 管理员：可以为任何餐厅生成令牌（通过 `company_id` 过滤）

---

#### 燃料传感器数据 API

**路由**：`POST /api/fuel-sensor`

**文件位置**：`app/api/fuel-sensor/route.ts`

**功能**：
- 接收IoT设备燃料传感器数据
- 更新 `fuel_level` 表

**权限要求**：
- 公开API（IoT设备直接调用，需验证设备ID）

---

#### 商户位置 API

**路由**：`GET /api/merchant/location`

**文件位置**：`app/api/merchant/location/route.ts`

**功能**：
- 获取商户位置信息
- 用于地图展示和定位

**权限要求**：
- 公开API（无需登录）

---

#### 配送位置 API

**路由**：`POST /api/delivery/location`

**文件位置**：`app/api/delivery/location/route.ts`

**功能**：
- 更新配送员GPS位置
- 更新 `delivery_locations` 表

**权限要求**：
- 配送员：只能更新自己的位置
- 管理员：可以更新所有配送员位置（通过 `company_id` 过滤）

---

#### 状态变更 API

**路由**：`POST /api/status/transition`

**文件位置**：`app/api/status/transition/route.ts`

**功能**：
- 统一的状态变更接口
- 支持多种实体类型（订单、工单、设备等）
- 记录状态变更日志

**权限要求**：
- 根据实体类型和操作类型动态验证

---

#### 文件上传 API

**路由**：`POST /api/storage/upload`

**文件位置**：`app/api/storage/upload/route.ts`

**功能**：
- 上传文件到存储服务
- 返回文件URL

**权限要求**：
- 已登录用户：可以上传文件
- 管理员：可以上传文件

---

## 五、API 错误处理策略

### 5.1 错误分类

**A 类错误（系统不可恢复错误）**：
- Supabase 初始化失败
- 数据库连接失败
- 系统配置错误
- **处理方式**：使用 `console.error` 记录

**B 类错误（预期业务失败）**：
- 用户未登录
- 无权限访问
- 数据不存在
- **处理方式**：使用 `logBusinessWarning` 记录

**C 类错误（数据适配失败）**：
- ViewModel 转换失败
- 数据格式不匹配
- **处理方式**：使用 `console.warn` 记录，添加 `trace_id` / `order_id` 等追踪信息

---

### 5.2 错误响应格式

**成功响应**：
```typescript
{
  success: true
  data: { ... }
}
```

**失败响应**：
```typescript
{
  success: false
  error: string
  details?: unknown
}
```

---

**文档第二部分结束**

**完整文档包含两部分**：
- `docs/4-api-routes-reference-part1.md`：Facts API、Rental API
- `docs/4-api-routes-reference-part2.md`：业务 API、管理员 API、工人端 API、错误处理策略
