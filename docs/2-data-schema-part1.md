# 2. 数据模型与关联图谱 (Data Schema) - 第一部分

**生成时间**：2025-01-20  
**文档版本**：v1.0

---

## 一、核心业务表结构

### 1.1 用户与权限表

#### `auth.users`（Supabase 内置表）

**说明**：Supabase Auth 提供的用户基础信息表，由 Supabase 自动管理。

**核心字段**：
- `id` (UUID, PRIMARY KEY)：用户唯一标识
- `email` (TEXT)：用户邮箱
- `created_at` (TIMESTAMP)：创建时间
- `updated_at` (TIMESTAMP)：更新时间

**关联关系**：
- 被 `user_roles` 表引用（`user_id` → `auth.users.id`）
- 被 `user_companies` 表引用（`user_id` → `auth.users.id`）

---

#### `user_roles`（用户角色表）

**文件位置**：`第一步_创建user_roles表.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)              -- 记录唯一标识
- user_id (UUID, NOT NULL)            -- 用户ID（关联 auth.users）
- role (VARCHAR(50), NOT NULL)        -- 角色类型
  CHECK (role IN ('super_admin', 'admin', 'user', 'worker', 'supplier'))
- created_at (TIMESTAMP)               -- 创建时间
- updated_at (TIMESTAMP)               -- 更新时间
```

**角色枚举值**：
- `super_admin`：超级管理员（平台级，可访问所有租户数据）
- `admin`：供应商管理员（租户级，仅本租户数据）
- `staff`：员工（配送员/维修工/安装工）
- `user`：普通用户（已废弃，实际使用 `restaurant` 概念）
- `worker`：工人（已废弃，实际使用 `staff`）
- `supplier`：供应商（已废弃，实际通过 `user_companies` 关联）

**索引**：
- `idx_user_roles_user_id`：用户ID索引
- `idx_user_roles_role`：角色索引

**RLS 策略**：
- 用户只能查看自己的角色
- 管理员可以查看所有角色
- 服务角色完全访问

**关联关系**：
- `user_id` → `auth.users.id`（外键，ON DELETE CASCADE）

---

#### `user_companies`（用户与租户关联表）

**文件位置**：`修复多租户安全漏洞_完整SQL脚本.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)              -- 记录唯一标识
- user_id (UUID, NOT NULL)            -- 用户ID（关联 auth.users）
- company_id (UUID, NOT NULL)         -- 公司ID（关联 companies）
- role (VARCHAR(50))                  -- 用户在公司中的角色
  CHECK (role IN ('member', 'admin', 'owner'))
- is_primary (BOOLEAN)                -- 是否为主公司
- created_at (TIMESTAMP)              -- 创建时间
- updated_at (TIMESTAMP)              -- 更新时间
```

**业务意义**：
- 实现多租户数据隔离
- 一个用户可以关联多个公司（但只有一个主公司）
- 通过 `company_id` 实现数据隔离边界

**唯一约束**：
- `UNIQUE(user_id, company_id)`：一个用户在一个公司中只能有一条记录

**索引**：
- `idx_user_companies_user`：用户ID索引
- `idx_user_companies_company`：公司ID索引
- `idx_user_companies_primary`：主公司索引（WHERE is_primary = true）

**关联关系**：
- `user_id` → `auth.users.id`（外键，ON DELETE CASCADE）
- `company_id` → `companies.id`（外键，ON DELETE CASCADE）

---

#### `companies`（供应商/租户表）

**文件位置**：`完整修复companies表结构.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)              -- 公司唯一标识
- name (TEXT, NOT NULL)               -- 公司名称
- contact_name (TEXT)                 -- 联系人姓名
- contact_phone (TEXT)                -- 联系人电话
- contact_email (TEXT)                -- 联系人邮箱
- address (TEXT)                      -- 公司地址
- business_license (TEXT)             -- 营业执照号
- status (TEXT)                       -- 状态（active / inactive）
- created_at (TIMESTAMP)              -- 创建时间
- updated_at (TIMESTAMP)              -- 更新时间
```

**业务意义**：
- 多租户系统的核心表
- 每个供应商/公司是一个独立的租户
- 所有业务数据通过 `company_id` 关联到租户

**RLS 策略**：
- 服务角色完全访问
- 用户只能查看自己关联的公司（通过 `user_companies` 表）

**关联关系**：
- 被 `user_companies` 表引用（`company_id` → `companies.id`）
- 被 `equipment_catalog` 表引用（`company_id` → `companies.id`）
- 被 `rental_orders` 表引用（`supplier_id` → `companies.id`）

---

### 1.2 订单相关表

#### `delivery_orders`（燃料配送订单表）

**文件位置**：`migrations/20250120_split_orders_table_fixed.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)              -- 订单唯一标识
- restaurant_id (UUID, NOT NULL)      -- 餐厅ID（订单归属）
- service_type (TEXT)                 -- 服务类型（固定为"燃料配送"）
- product_type (TEXT)                 -- 产品类型
  CHECK (product_type IN ('lpg', 'methanol', 'clean_fuel', 'outdoor_fuel'))
- status (TEXT, NOT NULL)             -- 订单状态
  CHECK (status IN ('pending', 'accepted', 'delivering', 'completed', 'exception', 'rejected', 'cancelled'))
- amount (NUMERIC)                     -- 订单金额
- worker_id (UUID)                    -- 配送员ID（接单时写入）
- assigned_to (UUID)                  -- 分配对象（接单时写入）
- customer_confirmed (BOOLEAN)         -- 客户确认状态
- tracking_code (TEXT)                 -- 溯源码（完成配送时写入）
- proof_image (TEXT)                   -- 交付凭证图片（完成配送时写入）
- created_at (TIMESTAMP)               -- 订单创建时间
- updated_at (TIMESTAMP)               -- 订单更新时间
```

**状态枚举值**：
- `pending`：待接单
- `accepted`：已接单
- `delivering`：配送中
- `completed`：已完成
- `exception`：异常
- `rejected`：已拒绝
- `cancelled`：已取消

**索引**：
- `restaurant_id`：用于按餐厅查询订单
- `status`：用于状态筛选
- `worker_id`：用于查询配送员订单
- `assigned_to`：用于查询分配对象

**RLS 策略**：
- 餐厅只能查看自己的订单（`restaurant_id` 匹配）
- 配送员只能查看分配给自己的订单（`worker_id` 或 `assigned_to` 匹配）
- 管理员可以查看所有订单（通过 `company_id` 过滤）

**关联关系**：
- `restaurant_id` → `restaurants.id`（外键）
- `worker_id` → `workers.id`（外键，可选）
- `assigned_to` → `workers.id`（外键，可选）

**业务意义**：
- 从原 `orders` 表拆分而来（2025-01-20 迁移）
- 专门处理燃料配送订单
- 支持多种产品类型（液化气、甲醇、热能清洁燃料、户外环保燃料）

---

#### `repair_orders`（报修工单表）

**文件位置**：`migrations/20250120_split_orders_table_fixed.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)              -- 工单唯一标识
- restaurant_id (UUID, NOT NULL)      -- 餐厅ID（工单归属）
- service_type (TEXT)                 -- 服务类型
  CHECK (service_type IN ('维修服务', '清洁服务', '工程改造'))
- status (TEXT, NOT NULL)             -- 工单状态
  CHECK (status IN ('pending', 'accepted', 'processing', 'completed', 'cancelled'))
- urgency (TEXT)                      -- 紧急程度（low / normal / high）
- description (TEXT)                   -- 问题描述
- audio_url (TEXT)                     -- 语音录音URL
- worker_id (UUID)                     -- 维修工ID（接单时写入）
- repair_amount (NUMERIC)              -- 维修费用
- created_at (TIMESTAMP)               -- 工单创建时间
- updated_at (TIMESTAMP)               -- 工单更新时间
```

**状态枚举值**：
- `pending`：待接单
- `accepted`：已接单
- `processing`：处理中
- `completed`：已完成
- `cancelled`：已取消

**索引**：
- `restaurant_id`：用于按餐厅查询工单
- `status`：用于状态筛选
- `worker_id`：用于查询维修工工单

**RLS 策略**：
- 餐厅只能查看自己的工单（`restaurant_id` 匹配）
- 维修工只能查看分配给自己的工单（`worker_id` 匹配）
- 管理员可以查看所有工单（通过 `company_id` 过滤）

**关联关系**：
- `restaurant_id` → `restaurants.id`（外键）
- `worker_id` → `workers.id`（外键，可选）

**业务意义**：
- 从原 `orders` 表拆分而来（2025-01-20 迁移）
- 专门处理报修工单（维修、清洁、工程改造）
- 支持语音录音上传

---

#### `orders`（原订单表，已废弃）

**说明**：原订单表，已拆分为 `delivery_orders` 和 `repair_orders`。

**状态**：保留 30 天作为备份，后续将删除。

---

### 1.3 设备相关表

#### `devices`（IoT 设备表）

**文件位置**：`database-schema-devices.sql`

**核心字段**：
```sql
- device_id (TEXT, PRIMARY KEY)      -- 设备唯一标识（二维码值）
- restaurant_id (UUID, NOT NULL)      -- 餐厅ID（设备归属）
- model (TEXT, NOT NULL)              -- 设备型号
- install_date (TIMESTAMP, NOT NULL)  -- 安装日期
- address (TEXT, NOT NULL)            -- 安装地址
- installer (TEXT)                    -- 安装人
- status (TEXT, NOT NULL)              -- 设备状态
  CHECK (status IN ('active', 'online', 'offline', '持有'))
- container_type (TEXT)                -- 容器类型
  CHECK (container_type IN ('fixed_tank', 'cylinder'))
- is_locked (BOOLEAN)                 -- 是否锁定
- created_at (TIMESTAMP)               -- 创建时间
- updated_at (TIMESTAMP)               -- 更新时间
```

**状态枚举值**：
- `active`：激活
- `online`：在线
- `offline`：离线
- `持有`：持有状态

**索引**：
- `idx_devices_status`：状态索引
- `idx_devices_is_locked`：锁定状态索引
- `idx_devices_created_at`：创建时间索引

**关联关系**：
- `restaurant_id` → `restaurants.id`（外键）
- 被 `fuel_level` 表引用（`device_id` → `devices.device_id`）

**业务意义**：
- IoT 智能传感器设备
- 通过 `device_id`（二维码值）唯一标识
- 支持固定油箱和流动钢瓶两种容器类型

---

#### `fuel_level`（燃料级别表）

**说明**：存储 IoT 设备实时燃料数据。

**核心字段**：
```sql
- id (BIGSERIAL, PRIMARY KEY)         -- 记录唯一标识
- device_id (TEXT, NOT NULL)          -- 设备ID（关联 devices）
- percentage (NUMERIC)                 -- 燃料剩余百分比（0-100）
- current_tank_id (TEXT)               -- 当前油箱ID
- is_locked (BOOLEAN)                  -- 是否锁定
- created_at (TIMESTAMP)               -- 记录创建时间
```

**索引**：
- `idx_fuel_level_device_id`：设备ID索引
- `idx_fuel_level_current_tank_id`：油箱ID索引

**实时订阅**：
- 已启用 Supabase Realtime
- 用于 `components/iot-dashboard.tsx` 实时更新

**关联关系**：
- `device_id` → `devices.device_id`（外键）

---

#### `equipment`（租赁设备表）

**文件位置**：`创建设备相关表的完整脚本.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 设备唯一标识
- category_id (UUID)                   -- 分类ID（关联 equipment_categories）
- name (TEXT, NOT NULL)                -- 设备名称
- brand (TEXT)                         -- 品牌
- model (TEXT)                         -- 型号
- description (TEXT)                   -- 描述
- images (TEXT[])                      -- 图片URL数组
- monthly_rental_price (NUMERIC)       -- 月租金
- daily_rental_price (NUMERIC)         -- 日租金
- deposit_amount (NUMERIC)             -- 押金
- min_rental_period (INTEGER)          -- 最短租赁期（天）
- max_rental_period (INTEGER)          -- 最长租赁期（天）
- status (TEXT)                        -- 状态（available / rented / maintenance）
- created_at (TIMESTAMP)               -- 创建时间
- updated_at (TIMESTAMP)               -- 更新时间
```

**状态枚举值**：
- `available`：可用
- `rented`：已租出
- `maintenance`：维护中

**关联关系**：
- `category_id` → `equipment_categories.id`（外键）
- 被 `rental_orders` 表引用（`equipment_id` → `equipment.id`）

---

#### `equipment_categories`（设备分类表）

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 分类唯一标识
- name (TEXT, NOT NULL)                -- 分类名称
- description (TEXT)                   -- 分类描述
- created_at (TIMESTAMP)               -- 创建时间
```

**关联关系**：
- 被 `equipment` 表引用（`category_id` → `equipment_categories.id`）

---

#### `equipment_catalog`（设备产品目录表）

**文件位置**：`创建equipment_catalog表.sql`

**核心字段**：
```sql
- id (UUID, PRIMARY KEY)               -- 产品唯一标识
- company_id (UUID, NOT NULL)          -- 供应商公司ID（关联 companies）
- category_id (UUID)                   -- 分类ID
- name (TEXT, NOT NULL)                -- 产品名称
- brand (TEXT)                         -- 品牌
- model (TEXT)                         -- 型号
- description (TEXT)                   -- 描述
- images (TEXT[])                      -- 图片URL数组
- monthly_rental_price (NUMERIC)       -- 月租金
- deposit_amount (NUMERIC)             -- 押金
- approval_status (TEXT)              -- 审核状态（pending / approved / rejected）
- created_at (TIMESTAMP)               -- 创建时间
- updated_at (TIMESTAMP)               -- 更新时间
```

**审核状态枚举值**：
- `pending`：待审核
- `approved`：已通过
- `rejected`：已拒绝

**关联关系**：
- `company_id` → `companies.id`（外键）
- `category_id` → `equipment_categories.id`（外键，可选）

**业务意义**：
- 供应商上传的产品目录
- 需要管理员审核后才能上架
- 审核通过后可以创建 `equipment` 记录

---

**文档第一部分结束，请继续查看第二部分**
