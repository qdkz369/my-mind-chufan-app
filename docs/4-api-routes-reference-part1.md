# 4. API 路由参考 (API Routes Reference) - 第一部分

**生成时间**：2025-01-20  
**文档版本**：v1.0

---

## 一、API 架构概述

### 1.1 API 设计原则

**核心原则**：
- **Facts API**：只读事实数据，不包含计算和业务逻辑
- **严格分离**：Facts API 与 Rental System（租赁系统）严格分离
- **多租户隔离**：所有 API 必须通过 `company_id` 实现数据隔离
- **权限验证**：所有 API 必须验证用户权限（通过 `getUserContext`）

**API 分类**：
1. **Facts API**（只读事实数据）
   - 设备状态、订单详情、资产列表等
   - 不包含计算、不包含租赁逻辑

2. **Rental API**（租赁系统）
   - 租赁合同、使用快照、设备所有权等
   - 严格分离，不反向影响 Facts

3. **业务 API**（业务操作）
   - 订单创建、状态更新、数据修改等
   - 包含业务逻辑和权限验证

---

### 1.2 API 路由结构

**Next.js App Router 结构**：
```
app/api/
├── facts/                    # Facts API（只读事实数据）
│   ├── restaurant/
│   │   └── [restaurant_id]/
│   │       ├── overview/    # 餐厅概览
│   │       ├── assets/      # 资产列表
│   │       └── latest-order/ # 最新订单
│   └── orders/
│       └── [order_id]/      # 订单详情
├── rental/                   # 租赁系统 API
│   ├── contracts/           # 租赁合同
│   ├── usage-snapshots/     # 使用快照
│   └── ownerships/          # 设备所有权
└── [其他业务 API]/
```

---

## 二、Facts API（只读事实数据）

### 2.1 餐厅概览 API

**路由**：`GET /api/facts/restaurant/[restaurant_id]/overview`

**文件位置**：`app/api/facts/restaurant/[restaurant_id]/overview/route.ts`

**功能**：
- 获取餐厅的概览数据（只读事实）
- 包括设备数量、订单统计等

**请求参数**：
- `restaurant_id`（路径参数）：餐厅ID

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    restaurant_id: string
    device_count: number
    order_count: number
    // ... 其他事实数据
  }
  error?: string
}
```

**权限要求**：
- 餐厅用户：只能查看自己的餐厅数据
- 管理员：可以查看所有餐厅数据（通过 `company_id` 过滤）

**错误处理**：
- 如果 `supabase` 不可用，返回默认成功响应（空数据）
- 使用 `logBusinessWarning` 记录业务警告（B 类错误）

---

### 2.2 资产列表 API

**路由**：`GET /api/facts/restaurant/[restaurant_id]/assets`

**文件位置**：`app/api/facts/restaurant/[restaurant_id]/assets/route.ts`

**功能**：
- 获取餐厅的资产列表（只读事实）
- 包括设备列表、资产详情等

**请求参数**：
- `restaurant_id`（路径参数）：餐厅ID

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    assets: Array<{
      id: string
      name: string
      type: string
      // ... 其他资产信息
    }>
  }
  error?: string
}
```

**权限要求**：
- 餐厅用户：只能查看自己的餐厅资产
- 管理员：可以查看所有餐厅资产（通过 `company_id` 过滤）

**错误处理**：
- 如果 `supabase` 不可用，返回默认成功响应（空数组）
- 使用 `logBusinessWarning` 记录业务警告（B 类错误）

---

### 2.3 最新订单 API

**路由**：`GET /api/facts/restaurant/[restaurant_id]/latest-order`

**文件位置**：`app/api/facts/restaurant/[restaurant_id]/latest-order/route.ts`

**功能**：
- 获取餐厅的最新已完成订单ID（只读事实）
- 用于获取最新订单的详细信息

**请求参数**：
- `restaurant_id`（路径参数）：餐厅ID

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    order_id: string | null
  }
  error?: string
}
```

**权限要求**：
- 餐厅用户：只能查看自己的餐厅订单
- 管理员：可以查看所有餐厅订单（通过 `company_id` 过滤）

**错误处理**：
- 如果 `supabase` 不可用，返回默认成功响应（`order_id: null`）
- 使用 `logBusinessWarning` 记录业务警告（B 类错误）

---

### 2.4 订单详情 API

**路由**：`GET /api/facts/orders/[order_id]`

**文件位置**：`app/api/facts/orders/[order_id]/route.ts`

**功能**：
- 获取订单的详细信息（只读事实）
- 包括订单状态、配送信息、时间线等

**请求参数**：
- `order_id`（路径参数）：订单ID

**响应格式**：
```typescript
{
  success: boolean
  data?: {
    order: {
      id: string
      restaurant_id: string
      status: string
      // ... 其他订单信息
    }
    traces?: Array<{
      id: string
      timestamp: string
      // ... 其他追踪信息
    }>
  }
  error?: string
}
```

**权限要求**：
- 餐厅用户：只能查看自己餐厅的订单
- 管理员：可以查看所有订单（通过 `company_id` 过滤）

**错误处理**：
- 如果 `supabase` 不可用，返回结构化错误响应（`success: false`）
- 如果合同验证失败，返回结构化错误响应
- 使用 `logBusinessWarning` 记录业务警告（B 类错误）

**业务逻辑**：
- 验证订单是否存在
- 验证订单是否属于当前用户的餐厅（或管理员权限）
- 验证租赁合同（如果订单关联租赁合同）

---

## 三、Rental API（租赁系统）

### 3.1 租赁合同 API

**路由**：`GET /api/rental/contracts`

**文件位置**：`app/api/rental/contracts/route.ts`（如果存在）

**功能**：
- 获取租赁合同列表
- 创建租赁合同
- 更新租赁合同状态

**权限要求**：
- 管理员：可以查看和创建租赁合同
- 餐厅用户：只能查看自己的租赁合同

**业务逻辑**：
- 验证合同状态（draft / active / ended / breached）
- 验证计费模式（fixed / usage_based / hybrid）
- 验证合同时间范围

---

### 3.2 使用快照 API

**路由**：`GET /api/rental/usage-snapshots`

**文件位置**：`app/api/rental/usage-snapshots/route.ts`（如果存在）

**功能**：
- 获取设备使用快照列表
- 创建使用快照（冻结使用事实）

**权限要求**：
- 管理员：可以查看和创建使用快照
- 餐厅用户：只能查看自己的使用快照

**业务逻辑**：
- 使用快照只消费 Facts 结果，不反向影响 Facts
- 使用快照不包含任何结算、支付、发票逻辑
- `usage_value` 只是"量"（使用量），不是"钱"（金额）

**数据来源**：
- `fact_source`：明确写死来源（`order_facts` / `device_facts` / `manual_override`）
- `generated_from_fact_at`：Facts 中最新事实时间，用于追溯快照生成时的 Facts 状态

---

### 3.3 设备所有权 API

**路由**：`GET /api/rental/ownerships`

**文件位置**：`app/api/rental/ownerships/route.ts`（如果存在）

**功能**：
- 获取设备所有权列表
- 创建设备所有权记录
- 更新设备所有权状态

**权限要求**：
- 管理员：可以查看和创建设备所有权
- 餐厅用户：只能查看自己设备的所有权

**业务逻辑**：
- 记录设备的所有权变更历史
- 支持设备在不同主体间流转（platform / manufacturer / leasing_company / finance_partner）
- 用于资产溯源和财务核算

---

**文档第一部分结束，请继续查看第二部分**
