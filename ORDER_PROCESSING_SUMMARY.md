# 三端订单处理核心逻辑汇总

## 1. 数据模型 (lib/types/order.ts)

```typescript
// 订单状态枚举（注意：实际使用中统一为小写字符串）
export enum OrderStatus {
  PENDING_INSTALL = "pending_install",
  PENDING_ACCEPTANCE = "pending_acceptance",
  ACTIVE = "active",
  PROCESSING = "processing",
  DELIVERING = "delivering",
  COMPLETED = "completed",
}

// 产品类型枚举
export enum ProductType {
  LPG = "lpg",
  METHANOL = "methanol",
  CLEAN_FUEL = "clean_fuel",
  OUTDOOR_FUEL = "outdoor_fuel",
}

// 订单接口
export interface Order {
  id: string                    // 主键标识符（统一使用 id）
  restaurant_id: string
  product_type: ProductType | null
  service_type: string          // 服务类型：如 "燃料配送"、"维修服务"
  status: OrderStatus           // 状态值（实际存储为小写字符串）
  amount: number
  assigned_to: string | null    // 指派配送员ID
  worker_id: string | null      // 兼容旧字段
  customer_confirmed: boolean
  created_at: string
  updated_at: string
}
```

## 2. 用户端 (app/customer/order/page.tsx)

### handleSubmit 提交字段

```typescript
// API: POST /api/orders/create
body: JSON.stringify({
  restaurant_id: restaurantId,                    // 餐厅ID
  product_type: selectedProductType,               // 产品类型：lpg | methanol | clean_fuel | outdoor_fuel
  service_type: `${product?.name} - ${quantity}${product?.unit}`,  // 示例："液化气 - 50kg"
  status: "pending",                              // 固定值：小写 "pending"
  amount: totalAmount,                            // 订单金额
})
```

**关键字段值：**
- `status`: **"pending"** (小写，待处理状态)
- `service_type`: 格式为 `"{产品名称} - {数量}{单位}"`，如 "液化气 - 50kg"
- `product_type`: 枚举值 `"lpg" | "methanol" | "clean_fuel" | "outdoor_fuel"`

## 3. 工人端 (components/worker/repair-list.tsx)

### loadRepairs 查询逻辑

```typescript
// 查询策略：先查询所有订单，客户端过滤维修订单
let query = supabase
  .from("orders")
  .select("id, restaurant_id, service_type, status, description, amount, urgency, contact_phone, created_at, updated_at, assigned_to, worker_id, audio_url, restaurants(id, name, address, contact_phone, contact_name)")
  .order("created_at", { ascending: false })
  .limit(500)

// 客户端过滤维修订单（service_type 匹配规则）
const isRepair = 
  serviceType === "维修服务" ||
  serviceType.includes("维修") ||
  serviceType.toLowerCase().includes("repair") ||
  serviceType === "repair"

// 状态筛选
if (statusFilter && statusFilter !== "all") {
  repairOrders = repairOrders.filter((order: any) => order.status === statusFilter)
}

// Worker ID 筛选逻辑
if (workerId) {
  if (statusFilter && statusFilter !== "all" && statusFilter !== "pending") {
    // 其他状态：只显示分配给该工人的工单
    repairOrders = repairOrders.filter((order: any) => 
      order.assigned_to === workerId || order.worker_id === workerId
    )
  } else if (statusFilter === "all") {
    // all 状态：显示所有待处理的工单 + 分配给该工人的其他状态工单
    repairOrders = repairOrders.filter((order: any) => 
      order.status === "pending" || 
      order.assigned_to === workerId || 
      order.worker_id === workerId
    )
  }
  // pending 状态：显示所有待处理的工单（不限制 worker_id）
}
```

**关键字段值：**
- `service_type` 匹配：**"维修服务"** 或包含 **"维修"** 或包含 **"repair"**（不区分大小写）
- `status` 筛选值：**"pending" | "processing" | "completed" | "all"**（全部小写）
- `statusFilter === "pending"` 时：显示所有待处理工单，不限制 `worker_id`

## 4. 管理端 (app/(admin)/dashboard/page.tsx)

### 4.1 loadAllOrders（订单管理）

```typescript
let query = supabase
  .from("orders")
  .select("id, restaurant_id, service_type, status, amount, created_at, updated_at, worker_id, assigned_to, description")
  .order("created_at", { ascending: false })

// 服务类型筛选
if (orderServiceTypeFilter !== "all") {
  query = query.eq("service_type", orderServiceTypeFilter)  // 精确匹配
}

// 状态筛选
if (orderStatusFilter !== "all") {
  query = query.eq("status", orderStatusFilter)  // 精确匹配
}

// 格式化订单（默认值处理）
const formattedOrders = ordersData.map((order: any) => ({
  id: order.id,
  restaurant_id: order.restaurant_id,
  service_type: order.service_type || "燃料配送",  // 默认值
  status: order.status || "pending",                // 默认值：小写 "pending"
  amount: order.amount || 0,
  worker_id: order.worker_id || order.assigned_to,
}))
```

**关键字段值：**
- `orderServiceTypeFilter`: **"all" | "维修服务" | "燃料配送"**（精确匹配）
- `orderStatusFilter`: **"all" | "pending" | "delivering" | "processing" | "completed"**（全部小写）
- `status` 默认值：**"pending"**（小写）

### 4.2 loadRepairs（报修管理）

```typescript
// 查询策略：先查询所有订单，客户端过滤维修订单
const { data: allOrders } = await supabase
  .from("orders")
  .select("id, restaurant_id, service_type, status, description, amount, urgency, contact_phone, created_at, updated_at, assigned_to, worker_id, audio_url")
  .order("created_at", { ascending: false })
  .limit(500)

// 客户端过滤维修订单（service_type 匹配规则）
const isRepair = 
  serviceType === "维修服务" ||
  serviceType.includes("维修") ||
  serviceType.toLowerCase().includes("repair") ||
  serviceType === "repair"

// 状态筛选
if (repairStatusFilter && repairStatusFilter !== "all") {
  filteredRepairs = repairOrders.filter((r: any) => r.status === repairStatusFilter)
}
```

**关键字段值：**
- `service_type` 匹配：**"维修服务"** 或包含 **"维修"** 或包含 **"repair"**（不区分大小写）
- `repairStatusFilter`: **"all" | "pending" | "processing" | "completed" | "cancelled"**（全部小写）

## 5. 状态字段统一规范

### 状态值（全部小写字符串）

| 状态值 | 含义 | 使用场景 |
|--------|------|----------|
| `"pending"` | 待处理 | 用户端创建订单、报修工单初始状态 |
| `"processing"` | 处理中 | 工人接单后、管理员指派后 |
| `"delivering"` | 配送中 | 配送订单专用 |
| `"completed"` | 已完成 | 订单/工单完成 |
| `"cancelled"` | 已取消 | 订单/工单取消 |

### service_type 字段规范

| 服务类型 | 值 | 说明 |
|----------|-----|------|
| 燃料配送 | `"燃料配送"` 或 `"{产品名} - {数量}{单位}"` | 用户端创建时动态生成 |
| 维修服务 | `"维修服务"` | 报修工单固定值 |

## 6. 关键一致性检查点

1. **状态字段统一性**：
   - ✅ 用户端提交：`status: "pending"`（小写）
   - ✅ 工人端筛选：`"pending" | "processing" | "completed"`（小写）
   - ✅ 管理端筛选：`"pending" | "processing" | "completed" | "cancelled"`（小写）

2. **service_type 匹配规则**：
   - ✅ 工人端和管理端使用相同的客户端过滤逻辑
   - ✅ 匹配规则：`=== "维修服务"` 或 `includes("维修")` 或 `includes("repair")`

3. **主键标识符**：
   - ✅ 统一使用 `id` 作为主键（API 参数和查询都使用 `id`）

4. **默认值处理**：
   - ✅ 管理端 `loadAllOrders` 中：`status` 默认值为 `"pending"`（小写）
   - ✅ 管理端 `loadAllOrders` 中：`service_type` 默认值为 `"燃料配送"`

