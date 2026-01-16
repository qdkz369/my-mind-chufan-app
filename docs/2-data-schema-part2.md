# 2. 数据模型与关联图谱 (Data Schema) - 第二部分

**生成时间**：2025-01-20  
**文档版本**：v1.0

---

## 二、租赁相关表结构

### 2.1 `rental_orders`（设备租赁订单表）

**文件位置**：`一键重建所有租赁表.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 订单唯一标识
- equipment_id (UUID)                   -- 设备ID（关联 equipment）
- restaurant_id (UUID)                  -- 餐厅ID（承租人）
- supplier_id (UUID)                    -- 供应商ID（关联 companies）
- start_date (DATE)                     -- 租赁开始日期
- end_date (DATE)                       -- 租赁结束日期
- monthly_rental_price (NUMERIC)         -- 月租金
- deposit_amount (NUMERIC)              -- 押金
- status (TEXT)                         -- 订单状态
  CHECK (status IN ('pending', 'active', 'completed', 'cancelled'))
- delivery_proof_image (TEXT)            -- 交付凭证图片
- created_at (TIMESTAMP)                -- 创建时间
- updated_at (TIMESTAMP)                -- 更新时间
```

**状态枚举值**：
- `pending`：待处理
- `active`：生效中
- `completed`：已完成
- `cancelled`：已取消

**关联关系**：
- `equipment_id` → `equipment.id`（外键）
- `restaurant_id` → `restaurants.id`（外键）
- `supplier_id` → `companies.id`（外键）

---

### 2.2 `device_ownerships`（设备所有权表）

**文件位置**：`migrations/20250120_rental_ownership_contracts.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 记录唯一标识
- device_id (UUID, NOT NULL)            -- 设备ID
- owner_type (VARCHAR(50), NOT NULL)   -- 所有权类型
  CHECK (owner_type IN ('platform', 'manufacturer', 'leasing_company', 'finance_partner'))
- owner_id (UUID, NOT NULL)            -- 所有权主体ID
- start_at (TIMESTAMPTZ, NOT NULL)     -- 所有权开始时间
- end_at (TIMESTAMPTZ)                 -- 所有权结束时间（NULL 表示当前有效）
- created_at (TIMESTAMPTZ)             -- 创建时间
- updated_at (TIMESTAMPTZ)              -- 更新时间
```

**所有权类型枚举值**：
- `platform`：平台所有
- `manufacturer`：厂家所有
- `leasing_company`：租赁公司所有
- `finance_partner`：金融机构所有

**业务意义**：
- 记录设备的所有权变更历史
- 支持设备在不同主体间流转
- 用于资产溯源和财务核算

**索引**：
- `idx_device_ownerships_device_id`：设备ID索引
- `idx_device_ownerships_owner_type`：所有权类型索引
- `idx_device_ownerships_owner_id`：所有权主体ID索引
- `idx_device_ownerships_device_owner`：设备ID + 所有权类型复合索引

---

### 2.3 `rental_contracts`（租赁合同主表）

**文件位置**：`migrations/20250120_rental_ownership_contracts.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 合同唯一标识
- contract_no (VARCHAR(100), UNIQUE)  -- 合同编号
- lessee_restaurant_id (UUID, NOT NULL) -- 承租人餐厅ID
- lessor_type (VARCHAR(50), NOT NULL)  -- 出租人类型
  CHECK (lessor_type IN ('platform', 'manufacturer', 'leasing_company', 'finance_partner'))
- lessor_id (UUID, NOT NULL)           -- 出租人ID
- start_at (DATE, NOT NULL)            -- 合同开始日期
- end_at (DATE, NOT NULL)              -- 合同结束日期
- billing_model (VARCHAR(50), NOT NULL) -- 计费模式
  CHECK (billing_model IN ('fixed', 'usage_based', 'hybrid'))
- status (VARCHAR(50), NOT NULL)       -- 合同状态
  CHECK (status IN ('draft', 'active', 'ended', 'breached'))
- remark (TEXT)                        -- 备注
- created_at (TIMESTAMPTZ)             -- 创建时间
- updated_at (TIMESTAMPTZ)             -- 更新时间
```

**计费模式枚举值**：
- `fixed`：固定费用
- `usage_based`：按使用量计费
- `hybrid`：混合模式

**合同状态枚举值**：
- `draft`：草稿
- `active`：生效中
- `ended`：已结束
- `breached`：违约

**关联关系**：
- `lessee_restaurant_id` → `restaurants.id`（外键）

---

### 2.4 `rental_contract_devices`（合同-设备关系表）

**文件位置**：`migrations/20250120_rental_ownership_contracts.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 记录唯一标识
- contract_id (UUID, NOT NULL)        -- 合同ID（关联 rental_contracts）
- device_id (UUID, NOT NULL)           -- 设备ID
- agreed_daily_fee (NUMERIC)           -- 约定日租金（固定费用模式）
- agreed_monthly_fee (NUMERIC)         -- 约定月租金（固定费用模式）
- agreed_usage_metric (VARCHAR(50))   -- 约定使用量计量单位（按使用量计费模式）
  CHECK (agreed_usage_metric IN ('hours', 'orders', 'energy'))
- created_at (TIMESTAMPTZ)             -- 创建时间
- updated_at (TIMESTAMPTZ)             -- 更新时间
```

**关联关系**：
- `contract_id` → `rental_contracts.id`（外键）
- `device_id` → `devices.device_id`（外键）

---

### 2.5 `usage_snapshots`（使用快照表）

**文件位置**：`migrations/20250120_usage_snapshots.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 快照唯一标识
- contract_id (UUID, NOT NULL)         -- 合同ID（关联 rental_contracts）
- device_id (UUID, NOT NULL)           -- 设备ID
- snapshot_date (DATE, NOT NULL)       -- 快照日期
- usage_value (NUMERIC)                 -- 使用量值
- usage_metric (VARCHAR(50))           -- 使用量计量单位
- disputed (BOOLEAN)                    -- 是否争议
- locked (BOOLEAN)                      -- 是否锁定
- created_at (TIMESTAMPTZ)              -- 创建时间
- updated_at (TIMESTAMPTZ)              -- 更新时间
```

**业务意义**：
- 记录设备使用量快照（只读）
- 用于按使用量计费的合同
- 禁止基于快照生成账单或应收应付
- 禁止基于快照修改订单状态

**关联关系**：
- `contract_id` → `rental_contracts.id`（外键）
- `device_id` → `devices.device_id`（外键）

---

### 2.6 `device_rentals`（设备租赁记录表）

**文件位置**：`migrations/20250120_device_rentals.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 记录唯一标识
- device_id (UUID, NOT NULL)           -- 设备ID
- restaurant_id (UUID, NOT NULL)      -- 餐厅ID（承租人）
- start_date (DATE, NOT NULL)          -- 租赁开始日期
- end_date (DATE)                      -- 租赁结束日期（NULL 表示当前有效）
- monthly_fee (NUMERIC)                -- 月租金
- deposit (NUMERIC)                     -- 押金
- status (TEXT)                        -- 状态
  CHECK (status IN ('active', 'ended', 'cancelled'))
- created_at (TIMESTAMPTZ)             -- 创建时间
- updated_at (TIMESTAMPTZ)             -- 更新时间
```

**关联关系**：
- `device_id` → `devices.device_id`（外键）
- `restaurant_id` → `restaurants.id`（外键）

---

## 三、位置与日志表

### 3.1 `restaurants`（餐厅表）

**文件位置**：`database-migration-restaurant-management.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 餐厅唯一标识
- name (TEXT, NOT NULL)                -- 餐厅名称
- contact_name (TEXT)                  -- 联系人姓名
- contact_phone (TEXT)                 -- 联系人电话
- contact_email (TEXT)                 -- 联系人邮箱
- address (TEXT)                       -- 餐厅地址
- latitude (NUMERIC)                    -- 纬度
- longitude (NUMERIC)                  -- 经度
- status (TEXT)                        -- 状态
  CHECK (status IN ('active', 'unactivated'))
- qr_token (TEXT)                      -- 二维码令牌
- total_refilled (NUMERIC)             -- 累计加注量
- created_at (TIMESTAMP)               -- 创建时间
- updated_at (TIMESTAMP)               -- 更新时间
```

**关联关系**：
- 被 `devices` 表引用（`restaurant_id` → `restaurants.id`）
- 被 `delivery_orders` 表引用（`restaurant_id` → `restaurants.id`）
- 被 `repair_orders` 表引用（`restaurant_id` → `restaurants.id`）
- 被 `rental_orders` 表引用（`restaurant_id` → `restaurants.id`）

---

### 3.2 `workers`（工人表）

**文件位置**：`CREATE_WORKERS_TABLE_FINAL.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 工人唯一标识
- name (TEXT, NOT NULL)                -- 工人姓名
- phone (TEXT)                         -- 工人电话
- worker_type (TEXT)                   -- 工人类型
  CHECK (worker_type IN ('delivery', 'repair', 'install', 'mixed'))
- product_types (JSONB)                -- 产品类型数组
  DEFAULT '[]'::jsonb
- status (TEXT)                        -- 状态
  DEFAULT 'active'
  CHECK (status IN ('active', 'inactive'))
- created_at (TIMESTAMPTZ)             -- 创建时间
- updated_at (TIMESTAMPTZ)             -- 更新时间
```

**工人类型枚举值**：
- `delivery`：配送员
- `repair`：维修工
- `install`：安装工
- `mixed`：混合类型

**关联关系**：
- 被 `delivery_orders` 表引用（`worker_id` / `assigned_to` → `workers.id`）
- 被 `repair_orders` 表引用（`worker_id` / `assigned_to` → `workers.id`）

---

### 3.3 `delivery_locations`（配送员GPS位置表）

**文件位置**：`database-schema.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 记录唯一标识
- delivery_id (TEXT, UNIQUE, NOT NULL) -- 配送员ID
- lat (NUMERIC(10, 7), NOT NULL)       -- 纬度
- lon (NUMERIC(10, 7), NOT NULL)       -- 经度
- updated_at (TIMESTAMPTZ, NOT NULL)   -- 最后更新时间
- created_at (TIMESTAMPTZ, NOT NULL)   -- 创建时间
```

**索引**：
- `idx_delivery_locations_delivery_id`：配送员ID索引
- `idx_delivery_locations_updated_at`：更新时间索引（DESC）

---

### 3.4 `merchant_locations`（商户注册定位地址表）

**文件位置**：`database-schema.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 记录唯一标识
- merchant_id (TEXT, UNIQUE, NOT NULL) -- 商户ID
- lat (NUMERIC(10, 7), NOT NULL)       -- 纬度
- lon (NUMERIC(10, 7), NOT NULL)       -- 经度
- address (TEXT)                        -- 详细地址
- city (TEXT)                           -- 城市
- registered_at (TIMESTAMPTZ, NOT NULL) -- 注册时间
- created_at (TIMESTAMPTZ, NOT NULL)   -- 创建时间
```

**索引**：
- `idx_merchant_locations_merchant_id`：商户ID索引

---

### 3.5 `audit_logs`（审计日志表）

**文件位置**：`migrations/20250120_audit_logs.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 日志唯一标识
- actor_id (UUID)                      -- 操作者ID（关联 auth.users）
- action (TEXT, NOT NULL)              -- 操作类型
- target_type (TEXT)                   -- 目标类型（如：order, device, user）
- target_id (UUID)                     -- 目标ID
- metadata (JSONB)                     -- 元数据（JSON格式）
- created_at (TIMESTAMPTZ)             -- 创建时间
```

**业务意义**：
- 记录所有关键操作（创建、更新、删除）
- 用于审计和追溯
- 支持 JSONB 格式存储元数据

**索引**：
- `actor_id`：操作者ID索引
- `target_type` + `target_id`：目标索引
- `created_at`：时间索引（DESC）

---

### 3.6 `status_change_logs`（状态变更日志表）

**文件位置**：`创建状态变更日志表.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 日志唯一标识
- entity_type (TEXT, NOT NULL)        -- 实体类型（如：order, device）
- entity_id (UUID, NOT NULL)           -- 实体ID
- old_status (TEXT)                    -- 旧状态
- new_status (TEXT, NOT NULL)          -- 新状态
- changed_by (UUID)                    -- 变更者ID
- reason (TEXT)                         -- 变更原因
- created_at (TIMESTAMPTZ)             -- 创建时间
```

**业务意义**：
- 记录所有状态变更历史
- 用于追溯状态流转过程

---

## 四、表关联关系图谱

### 4.1 用户与权限关联

```
auth.users (Supabase 内置)
    ├─→ user_roles (user_id)
    │   └─ role: super_admin | admin | staff | user | worker | supplier
    │
    └─→ user_companies (user_id)
        ├─→ companies (company_id)
        └─ role: member | admin | owner
        └─ is_primary: true | false
```

### 4.2 订单关联

```
restaurants
    ├─→ delivery_orders (restaurant_id)
    │   ├─→ workers (worker_id / assigned_to)
    │   └─ status: pending | accepted | delivering | completed | ...
    │
    └─→ repair_orders (restaurant_id)
        ├─→ workers (worker_id / assigned_to)
        └─ status: pending | accepted | processing | completed | ...
```

### 4.3 设备关联

```
restaurants
    └─→ devices (restaurant_id)
        ├─→ fuel_level (device_id)
        │   └─ percentage: 0-100
        │
        ├─→ device_ownerships (device_id)
        │   └─ owner_type: platform | manufacturer | leasing_company | finance_partner
        │
        └─→ device_rentals (device_id)
            └─ restaurant_id → restaurants
```

### 4.4 租赁关联

```
restaurants
    └─→ rental_contracts (lessee_restaurant_id)
        ├─→ rental_contract_devices (contract_id)
        │   └─→ devices (device_id)
        │
        └─→ usage_snapshots (contract_id)
            └─ device_id → devices

equipment
    └─→ rental_orders (equipment_id)
        ├─→ restaurants (restaurant_id)
        └─→ companies (supplier_id)
```

### 4.5 设备目录关联

```
companies
    └─→ equipment_catalog (company_id)
        ├─ approval_status: pending | approved | rejected
        └─→ equipment_categories (category_id)

equipment_categories
    └─→ equipment (category_id)
        └─→ rental_orders (equipment_id)
```

---

## 五、核心业务字段说明

### 5.1 订单状态流转

**配送订单（delivery_orders）**：
```
pending → accepted → delivering → completed
   ↓         ↓           ↓
rejected  exception   exception
```

**报修工单（repair_orders）**：
```
pending → accepted → processing → completed
   ↓         ↓
cancelled  cancelled
```

### 5.2 设备状态

**设备状态（devices.status）**：
- `active`：激活（已安装并绑定）
- `online`：在线（IoT 传感器正常）
- `offline`：离线（IoT 传感器断开）
- `持有`：持有状态（特殊状态）

### 5.3 多租户数据隔离

**隔离边界**：
- **超级管理员（super_admin）**：无限制，可访问所有数据
- **供应商管理员（admin）**：通过 `company_id` 过滤，仅本租户数据
- **员工（staff）**：通过 `worker_id` / `assigned_to` 过滤，仅分配给自己的订单
- **餐厅用户（restaurant）**：通过 `restaurant_id` 过滤，仅本餐厅数据

**实现方式**：
- **RLS 策略**：在数据库层面实现行级安全
- **API 层过滤**：在 API 路由中强制 `company_id` 过滤
- **统一权限验证**：通过 `getUserContext` 函数统一获取用户上下文

---

## 六、索引策略

### 6.1 查询优化索引

**高频查询字段索引**：
- `restaurant_id`：餐厅相关数据查询
- `status`：状态筛选查询
- `worker_id` / `assigned_to`：工人订单查询
- `company_id`：租户数据隔离查询
- `device_id`：设备相关数据查询

### 6.2 复合索引

**常用复合索引**：
- `(restaurant_id, status)`：按餐厅和状态查询订单
- `(worker_id, status)`：按工人和状态查询订单
- `(company_id, status)`：按租户和状态查询数据
- `(device_id, created_at DESC)`：按设备和时间查询历史数据

---

**文档第二部分结束**

**完整文档包含两部分**：
- `docs/2-data-schema-part1.md`：核心业务表（用户、订单、设备）
- `docs/2-data-schema-part2.md`：租赁相关表、位置日志表、关联图谱
