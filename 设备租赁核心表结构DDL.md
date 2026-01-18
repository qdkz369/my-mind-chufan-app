# 设备租赁核心表结构 DDL

> 数据库核心表结构文档（非全部表）
> 生成时间：2025-01-25

---

## 1. equipment（设备表）

### DDL
```sql
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES equipment_categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,                    -- 设备名称
  brand VARCHAR(100),                            -- 品牌
  model VARCHAR(100),                            -- 型号
  description TEXT,                              -- 设备描述
  specifications JSONB,                          -- 规格参数（JSON格式）
  images TEXT[],                                 -- 图片URL数组
  monthly_rental_price DECIMAL(10, 2) NOT NULL, -- 月租金
  daily_rental_price DECIMAL(10, 2),            -- 日租金（可选）
  deposit_amount DECIMAL(10, 2) DEFAULT 0,      -- 押金
  stock_quantity INTEGER DEFAULT 0,              -- 库存数量
  available_quantity INTEGER DEFAULT 0,          -- 可租数量
  status VARCHAR(20) DEFAULT 'active',           -- 设备状态：active, inactive, maintenance
  rental_status VARCHAR(20) DEFAULT 'available', -- 租赁状态：available, reserved, in_use, maintenance, retired
  current_rental_order_id UUID REFERENCES rental_orders(id) ON DELETE SET NULL, -- 当前占用该设备的租赁订单ID
  min_rental_period INTEGER DEFAULT 1,           -- 最短租期（月）
  max_rental_period INTEGER,                     -- 最长租期（月），NULL表示无限制
  maintenance_included BOOLEAN DEFAULT true,     -- 是否包含维护服务
  delivery_included BOOLEAN DEFAULT false,       -- 是否包含配送服务
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 约束
ALTER TABLE equipment
  ADD CONSTRAINT chk_equipment_rental_status 
  CHECK (rental_status IN ('available', 'reserved', 'in_use', 'maintenance', 'retired'));

-- 索引
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_rental_status ON equipment(rental_status);
CREATE INDEX IF NOT EXISTS idx_equipment_current_rental_order_id 
  ON equipment(current_rental_order_id) WHERE current_rental_order_id IS NOT NULL;
```

### 字段说明
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `rental_status` | VARCHAR(20) | **设备租赁状态机核心字段**<br>- `available`: 可租（设备空闲）<br>- `reserved`: 已预订（已下单但未交付）<br>- `in_use`: 使用中（已交付给客户）<br>- `maintenance`: 维护中（不可租）<br>- `retired`: 已退役（不再租赁） |
| `current_rental_order_id` | UUID | **当前占用该设备的租赁订单ID**<br>- 为空表示设备未被占用<br>- 用于防止重复预订和设备状态追踪 |
| `status` | VARCHAR(20) | 设备基础状态：`active`, `inactive`, `maintenance` |
| `deposit_amount` | DECIMAL(10,2) | 押金金额（与 `rental_deposits` 表无直接关联，押金信息存储在 `rental_orders.deposit_amount`） |

---

## 2. device_rentals（设备租赁关系表）

> **注意**：系统中使用的是 `device_rentals` 表，而非 `equipment_rentals`。

### DDL
```sql
CREATE TABLE IF NOT EXISTS device_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,                -- 租赁开始时间
  end_at TIMESTAMPTZ,                           -- 租赁结束时间（可为空，表示租赁尚未结束）
  status TEXT NOT NULL DEFAULT 'active',        -- 状态：active(租赁中), ended(已结束)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (status IN ('active', 'ended'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_device_rentals_device_id ON device_rentals(device_id);
CREATE INDEX IF NOT EXISTS idx_device_rentals_restaurant_id ON device_rentals(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_device_rentals_status ON device_rentals(status);
CREATE INDEX IF NOT EXISTS idx_device_rentals_start_at ON device_rentals(start_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_rentals_end_at ON device_rentals(end_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_rentals_device_status ON device_rentals(device_id, status);
CREATE INDEX IF NOT EXISTS idx_device_rentals_restaurant_status ON device_rentals(restaurant_id, status);
```

### 字段说明
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `device_id` | TEXT | 设备ID（关联 `devices` 表的 `device_id`） |
| `restaurant_id` | UUID | 餐厅ID（承租人） |
| `start_at` | TIMESTAMPTZ | 租赁开始时间（必填） |
| `end_at` | TIMESTAMPTZ | 租赁结束时间（可为空，表示租赁中） |
| `status` | TEXT | **租赁状态**<br>- `active`: 租赁中<br>- `ended`: 已结束 |

### 业务说明
- 表示设备的使用租赁关系（平台/厂家/租赁公司/金融机构参与）
- 只记录使用关系，不涉及所有权判断
- 与 `rental_orders` 表配合使用，记录实际的设备交付和使用情况

---

## 3. rental_contracts（租赁合同主表）

### DDL
```sql
CREATE TABLE IF NOT EXISTS rental_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_no VARCHAR(100) UNIQUE NOT NULL,     -- 合同编号
  lessee_restaurant_id UUID NOT NULL,           -- 承租人餐厅ID
  lessor_type VARCHAR(50) NOT NULL,             -- 出租人类型：platform, manufacturer, leasing_company, finance_partner
  lessor_id UUID NOT NULL,                      -- 出租人ID
  start_at DATE NOT NULL,                       -- 合同开始日期
  end_at DATE NOT NULL,                         -- 合同结束日期
  billing_model VARCHAR(50) NOT NULL,           -- 计费模式：fixed, usage_based, hybrid
  status VARCHAR(50) NOT NULL,                  -- 合同状态：draft, active, ended, breached
  remark TEXT,                                  -- 备注
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (lessor_type IN ('platform', 'manufacturer', 'leasing_company', 'finance_partner')),
  CHECK (billing_model IN ('fixed', 'usage_based', 'hybrid')),
  CHECK (status IN ('draft', 'active', 'ended', 'breached'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_rental_contracts_contract_no ON rental_contracts(contract_no);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_lessee_restaurant_id ON rental_contracts(lessee_restaurant_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_lessor_type ON rental_contracts(lessor_type);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_lessor_id ON rental_contracts(lessor_id);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_start_at ON rental_contracts(start_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_end_at ON rental_contracts(end_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_status ON rental_contracts(status);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_billing_model ON rental_contracts(billing_model);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_lessee_status ON rental_contracts(lessee_restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_lessor_status ON rental_contracts(lessor_type, lessor_id, status);
```

### 字段说明
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `contract_no` | VARCHAR(100) | 合同编号（唯一） |
| `lessee_restaurant_id` | UUID | 承租人餐厅ID |
| `lessor_type` | VARCHAR(50) | **出租人类型**<br>- `platform`: 平台<br>- `manufacturer`: 厂家<br>- `leasing_company`: 租赁公司<br>- `finance_partner`: 金融机构 |
| `lessor_id` | UUID | 出租人ID（根据 `lessor_type` 关联不同表） |
| `billing_model` | VARCHAR(50) | **计费模式**<br>- `fixed`: 固定费用<br>- `usage_based`: 按使用量计费<br>- `hybrid`: 混合模式 |
| `status` | VARCHAR(50) | **合同状态**<br>- `draft`: 草稿<br>- `active`: 生效中<br>- `ended`: 已结束<br>- `breached`: 违约 |

---

## 4. rental_payments（租赁支付表）

> **⚠️ 说明**：系统中**没有独立的 `rental_payments` 表**。支付信息通过以下方式记录：

### 4.1 rental_orders.monthly_payments（JSONB字段）
```sql
-- 在 rental_orders 表中
ALTER TABLE rental_orders 
  ADD COLUMN IF NOT EXISTS monthly_payments JSONB DEFAULT '[]';
```

**说明**：
- 存储每月支付记录的 JSON 数组
- 格式示例：`[{"month": "2025-01", "amount": 1000.00, "paid_at": "2025-01-15T10:00:00Z", ...}]`
- 用于向后兼容和历史记录

### 4.2 rental_billing_cycles（租赁账期表）

### DDL
```sql
CREATE TABLE IF NOT EXISTS rental_billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_order_id UUID NOT NULL REFERENCES rental_orders(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,                -- 账期序号（1, 2, 3...）
  cycle_month VARCHAR(7) NOT NULL,              -- 账期月份（格式：YYYY-MM）
  due_date DATE NOT NULL,                       -- 到期日期（应收日期）
  amount_due DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- 应收金额
  amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- 已收金额
  status VARCHAR(20) NOT NULL DEFAULT 'pending',    -- 状态：pending, paid, partial, overdue
  paid_at TIMESTAMP WITH TIME ZONE,             -- 支付时间（最后一次支付时间）
  payment_method VARCHAR(50),                   -- 支付方式（最后一次支付方式）
  payment_proof TEXT,                           -- 支付凭证（图片URL，最后一次）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rental_order_id, cycle_month)          -- 同一订单的同一月份只能有一条记录
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_billing_cycles_order_id ON rental_billing_cycles(rental_order_id);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_cycle_month ON rental_billing_cycles(cycle_month);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_due_date ON rental_billing_cycles(due_date);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_status ON rental_billing_cycles(status);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_order_month ON rental_billing_cycles(rental_order_id, cycle_month);
```

### 字段说明
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `rental_order_id` | UUID | 关联的租赁订单ID |
| `cycle_number` | INTEGER | 账期序号（1, 2, 3...） |
| `cycle_month` | VARCHAR(7) | 账期月份（格式：YYYY-MM） |
| `due_date` | DATE | 到期日期（应收日期） |
| `amount_due` | DECIMAL(10,2) | 应收金额 |
| `amount_paid` | DECIMAL(10,2) | 已收金额（累计） |
| `status` | VARCHAR(20) | **账期状态**<br>- `pending`: 待支付<br>- `paid`: 已支付<br>- `partial`: 部分支付<br>- `overdue`: 逾期 |
| `paid_at` | TIMESTAMPTZ | 支付时间（最后一次） |
| `payment_method` | VARCHAR(50) | 支付方式（最后一次） |
| `payment_proof` | TEXT | 支付凭证URL（最后一次） |

### 业务说明
- **每个租赁订单每月一条记录**（订单创建时自动生成）
- 支付成功时更新对应账期记录的 `amount_paid`、`status`、`paid_at` 等字段
- 与 `rental_orders.monthly_payments` **并行运行**，用于更精细的账期管理

---

## 5. rental_deposits（押金表）

> **⚠️ 说明**：系统中**没有独立的 `rental_deposits` 表**。

### 押金信息存储位置

押金信息存储在 `rental_orders` 表中：

```sql
-- 在 rental_orders 表中
deposit_amount DECIMAL(10, 2) DEFAULT 0,  -- 押金金额
```

### 字段说明
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `deposit_amount` | DECIMAL(10,2) | 订单押金金额<br>- 存储在 `rental_orders` 表中<br>- 设备押金参考 `equipment.deposit_amount` |

### 业务说明
- 押金金额在创建租赁订单时确定（来源于 `equipment.deposit_amount`）
- 押金支付状态由 `rental_orders.payment_status` 字段控制
- 如需独立管理押金的收退流程，可考虑未来新增 `rental_deposits` 表

---

## 6. 设备状态与状态流转规则

### 6.1 设备状态字段（equipment 表）

#### equipment.rental_status（租赁状态机）

| 状态值 | 说明 | 流转规则 |
|--------|------|----------|
| `available` | **可租** | 初始状态，设备空闲 |
| `reserved` | **已预订** | 订单创建后，设备状态改为 `reserved`，`current_rental_order_id` 写入订单ID |
| `in_use` | **使用中** | 客户确认签收后，设备状态改为 `in_use` |
| `maintenance` | **维护中** | 设备维护时，不可租赁 |
| `retired` | **已退役** | 设备不再租赁 |

#### 状态流转逻辑（代码实现）

```typescript
// 状态机流转规则（在 API 代码中实现）

// 1️⃣ 创建订单：available → reserved
if (订单创建成功) {
  equipment.rental_status = 'reserved'
  equipment.current_rental_order_id = 订单ID
}

// 2️⃣ 客户签收：reserved → in_use
if (delivery_verification.customer_confirmed === true) {
  equipment.rental_status = 'in_use'
}

// 3️⃣ 订单完成/取消：reserved/in_use → available
if (order_status === 'completed' || order_status === 'cancelled') {
  equipment.rental_status = 'available'
  equipment.current_rental_order_id = NULL
}
```

### 6.2 订单状态流转规则（rental_orders 表）

#### DDL（状态字段）
```sql
-- 在 rental_orders 表中
order_status VARCHAR(20) DEFAULT 'pending',  -- 订单状态：pending, confirmed, active, completed, cancelled
```

#### 状态流转规则（定义在 `lib/status-manager.ts`）

```typescript
export const STATUS_TRANSITIONS = {
  rental_orders: {
    pending: ["confirmed", "cancelled"],    // 待处理 → 已确认 / 已取消
    confirmed: ["active", "cancelled"],     // 已确认 → 进行中 / 已取消
    active: ["completed", "cancelled"],     // 进行中 → 已完成 / 已取消
    completed: [],                          // 终态：已完成（不允许再变更）
    cancelled: [],                          // 终态：已取消（不允许再变更）
  }
}
```

#### 状态流转图

```
pending (待处理)
  ├─→ confirmed (已确认)
  │     ├─→ active (进行中)
  │     │     ├─→ completed (已完成) [终态]
  │     │     └─→ cancelled (已取消) [终态]
  │     └─→ cancelled (已取消) [终态]
  └─→ cancelled (已取消) [终态]
```

#### 状态说明

| 状态值 | 说明 | 允许的下一个状态 |
|--------|------|------------------|
| `pending` | **待处理** | `confirmed`, `cancelled` |
| `confirmed` | **已确认** | `active`, `cancelled` |
| `active` | **进行中** | `completed`, `cancelled` |
| `completed` | **已完成** | （终态，不允许再变更） |
| `cancelled` | **已取消** | （终态，不允许再变更） |

#### 验证函数（lib/status-manager.ts）

```typescript
/**
 * 验证状态流转是否合法
 */
export function validateStatusTransition(
  table: string,
  currentStatus: string,
  newStatus: string
): { valid: boolean; reason?: string }

/**
 * 获取状态的所有可能的下一个状态
 */
export function getNextPossibleStatuses(
  table: string,
  currentStatus: string
): string[]

/**
 * 检查状态是否为终态（不允许再变更）
 */
export function isTerminalStatus(table: string, status: string): boolean
```

---

## 7. 表关系图

```
equipment (设备表)
  ├─ rental_status: available/reserved/in_use/maintenance/retired
  ├─ current_rental_order_id → rental_orders.id
  └─ deposit_amount (参考押金)

rental_orders (租赁订单表)
  ├─ order_status: pending/confirmed/active/completed/cancelled
  ├─ deposit_amount (订单押金)
  ├─ monthly_payments JSONB (历史支付记录)
  └─ → equipment.id

device_rentals (设备租赁关系表)
  ├─ status: active/ended
  ├─ → devices.device_id
  └─ → restaurants.id

rental_contracts (租赁合同表)
  ├─ status: draft/active/ended/breached
  └─ → restaurants.id (lessee)

rental_billing_cycles (账期表)
  ├─ status: pending/paid/partial/overdue
  └─ → rental_orders.id
```

---

## 8. 关键业务逻辑说明

### 8.1 设备状态与订单状态联动

- **订单创建**：`equipment.rental_status = 'reserved'` + `equipment.current_rental_order_id = 订单ID`
- **客户签收**：`equipment.rental_status = 'in_use'`（同时 `rental_orders.order_status = 'active'`）
- **订单完成/取消**：`equipment.rental_status = 'available'` + `equipment.current_rental_order_id = NULL`

### 8.2 支付管理

- **支付记录**：存储在 `rental_billing_cycles` 表（每订单每月一条）
- **历史记录**：同时更新 `rental_orders.monthly_payments` JSONB 字段（向后兼容）

### 8.3 押金管理

- **押金金额**：存储在 `rental_orders.deposit_amount`
- **设备押金参考**：`equipment.deposit_amount`
- **无独立押金表**：如需收退流程，可未来扩展

---

## 9. 索引与性能优化

### 关键索引
- `equipment.rental_status`：快速查询可租设备
- `equipment.current_rental_order_id`：防止重复预订
- `rental_orders.order_status`：订单状态筛选
- `rental_billing_cycles(rental_order_id, cycle_month)`：唯一约束，避免重复账期

---

**文档版本**：v1.0  
**最后更新**：2025-01-25

---

## 附录：完整租赁业务时序

### 业务场景：餐厅租一台设备 → 交付 → 使用 → 结算 → 退租

#### **阶段 1️⃣：餐厅下单（租设备）**

**Step 1：POST /api/equipment/rental/create**
- **请求体**：
  ```json
  {
    "restaurant_id": "uuid",
    "equipment_id": "uuid",
    "quantity": 1,
    "rental_period": 3,
    "start_date": "2025-02-01",
    "delivery_address": "北京市朝阳区...",
    "contact_phone": "13800138000",
    "payment_method": "cash"
  }
  ```

**Step 2：数据库操作（创建订单）**
- 插入 `rental_orders` 表：
  - `order_status = 'pending'`（待处理）
  - `payment_status = 'pending'`（待支付）
  - 计算 `total_amount = monthly_rental_price × rental_period × quantity`
  - 计算 `deposit_amount = equipment.deposit_amount × quantity`
  - 生成订单号（格式：`RENT{timestamp}{random}`）

**Step 3：设备状态变更**
- 更新 `equipment` 表：
  - `rental_status`: `available` → `reserved`（已预订）
  - `current_rental_order_id`: `NULL` → `订单ID`
- **说明**：防止设备被重复预订

**Step 4：生成账期记录**
- 插入 `rental_billing_cycles` 表：
  - 每个订单每月一条记录（`rental_period = 3` 则生成 3 条）
  - 每条记录：`cycle_number`（1, 2, 3...）、`cycle_month`（YYYY-MM）、`amount_due`（月租金）、`status = 'pending'`

**Step 5：记录事件**
- 插入 `rental_events` 表：
  - `event_type = 'order_created'`
  - `meta` 包含订单号、设备ID、租期、总金额等信息

---

#### **阶段 2️⃣：工人配送，客户签收（交付）**

**Step 6：POST /api/equipment/rental/worker/deliver**
- **请求体**：
  ```json
  {
    "order_id": "uuid",
    "worker_id": "uuid",
    "setup_photo": ["https://..."],
    "delivery_verification": {
      "customer_confirmed": true,
      "delivery_time": "2025-02-01T10:00:00Z",
      "customer_signature": "base64..."
    }
  }
  ```

**Step 7：订单状态变更（客户确认签收后）**
- 更新 `rental_orders` 表：
  - `order_status`: `pending` → `active`（租赁中）
  - `is_signed = true`
  - `delivery_time = 交付时间`
  - `setup_photo = 安装照片URL数组`

**Step 8：设备状态变更（客户确认签收后）**
- 更新 `equipment` 表：
  - `rental_status`: `reserved` → `in_use`（使用中）
- **说明**：设备正式交付给客户使用

**Step 9：记录事件**
- 插入 `rental_events` 表：
  - `event_type = 'rental_started'`
  - `meta` 包含设备ID、交付时间、客户确认状态、安装照片数量

---

#### **阶段 3️⃣：使用期间每月支付（结算）**

**Step 10：POST /api/equipment/rental/payment/monthly**
- **请求体**（每月支付一次）：
  ```json
  {
    "order_id": "uuid",
    "payment_month": "2025-02",
    "payment_amount": 1000.00,
    "payment_method": "alipay",
    "payment_proof": "https://..."
  }
  ```

**Step 11：更新订单支付记录**
- 更新 `rental_orders.monthly_payments`（JSONB 数组）：
  - 添加支付记录：`{ month: "2025-02", amount: 1000.00, payment_method: "alipay", paid_at: "2025-02-15T10:00:00Z", status: "paid" }`

**Step 12：更新账期记录**
- 更新 `rental_billing_cycles` 表：
  - 查找 `rental_order_id = 订单ID` 且 `cycle_month = "2025-02"` 的记录
  - `amount_paid = amount_paid + payment_amount`
  - `status = (amount_paid >= amount_due) ? 'paid' : 'partial'`
  - `paid_at = 当前时间`
  - `payment_method = 支付方式`
  - `payment_proof = 支付凭证URL`

**Step 13：记录事件**
- 插入 `rental_events` 表：
  - `event_type = 'monthly_payment'`
  - `meta` 包含支付月份、支付金额、支付方式、支付凭证

**重复 Step 10-13**：每个账期重复上述流程（例如：2025-02、2025-03、2025-04）

---

#### **阶段 4️⃣：租赁结束（退租）**

**Step 14：POST /api/equipment/rental/update**
- **请求体**：
  ```json
  {
    "id": "订单ID",
    "order_status": "completed"
  }
  ```
- **或使用状态流转API**：POST /api/status/transition
  ```json
  {
    "table": "rental_orders",
    "record_id": "订单ID",
    "new_status": "completed"
  }
  ```

**Step 15：订单状态变更**
- 更新 `rental_orders` 表：
  - `order_status`: `active` → `completed`（已完成）
  - **验证状态流转**：使用 `validateStatusTransition("rental_orders", "active", "completed")` 验证

**Step 16：设备状态恢复**
- 更新 `equipment` 表：
  - `rental_status`: `in_use` → `available`（可租）
  - `current_rental_order_id`: `订单ID` → `NULL`（清空占用关系）
- **说明**：设备恢复可用，可被其他订单预订

**Step 17：记录事件**
- 插入 `rental_events` 表：
  - `event_type = 'rental_ended'`
  - `meta` 包含订单状态、设备ID、结束原因（如有）

---

### 完整时序总结表

| 步骤 | API 调用 | 订单状态 | 设备状态 | 关键数据变更 |
|------|----------|----------|----------|--------------|
| **1-5** | POST /api/equipment/rental/create | `pending` | `available` → `reserved` | 创建订单、生成账期、记录事件 |
| **6-9** | POST /api/equipment/rental/worker/deliver | `pending` → `active` | `reserved` → `in_use` | 客户签收、更新设备状态 |
| **10-13** | POST /api/equipment/rental/payment/monthly | `active` | `in_use`（不变） | 更新支付记录、更新账期状态 |
| **14-17** | POST /api/equipment/rental/update | `active` → `completed` | `in_use` → `available` | 清空设备占用、记录结束事件 |

### 关键状态流转图

```
订单状态流转：
pending → active → completed
  ↓        ↓
cancelled cancelled

设备状态流转：
available → reserved → in_use → available
             ↑                     ↓
          (下单)              (退租完成)
```

### 注意事项

1. **设备状态机**：`equipment.rental_status` 与 `equipment.current_rental_order_id` 必须同步更新
2. **账期管理**：每个订单每月一条 `rental_billing_cycles` 记录，支付时更新对应账期
3. **事件记录**：所有关键操作都会记录到 `rental_events` 表，便于审计和追踪
4. **状态验证**：订单状态变更需通过 `validateStatusTransition` 验证，防止非法流转
5. **多租户隔离**：所有 API 都通过 `provider_id` 进行多租户数据隔离

---

**文档版本**：v1.1（新增业务时序）  
**最后更新**：2025-01-25
