# Data_Schema.md

**项目**: 商业厨房服务 APP  
**更新日期**: 2026-01-31  
**用途**: Supabase 表结构及 RLS 策略现状，供协作伙伴参考

---

## 一、核心业务表

### 1.1 delivery_orders（燃料配送订单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| restaurant_id | UUID | 餐厅ID，FK → restaurants |
| user_id | UUID | 可选 |
| product_type | TEXT | lpg, clean, alcohol 等 |
| service_type | TEXT | 默认 '燃料配送' |
| status | TEXT | pending, accepted, delivering, completed, exception, rejected, cancelled |
| assigned_to | TEXT/UUID | 配送员ID |
| worker_id | TEXT/UUID | 兼容字段 |
| tracking_code | TEXT | 溯源码 |
| proof_image | TEXT | 交付凭证 |
| amount | DECIMAL | 金额 |
| customer_confirmed | BOOLEAN | 客户确认 |
| company_id | UUID | 多租户，FK → companies |
| payment_method | TEXT | online \| corporate（对公支付） |
| payment_status | TEXT | pending \| paid \| pending_transfer \| transfer_confirmed |
| invoice_requested | BOOLEAN | 是否需要发票 |
| corporate_company_name | TEXT | 对公：客户公司名称 |
| corporate_tax_id | TEXT | 对公：客户纳税人识别号 |
| payment_voucher_url | TEXT | 对公：转账凭证图片URL |
| created_at, updated_at | TIMESTAMPTZ | |

**RLS**: 多数查询使用 Service Role 绕过；应用层按 company_id/restaurant_id 过滤。

---

### 1.2 repair_orders（报修工单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| restaurant_id | UUID | 餐厅ID |
| user_id | UUID | 可选 |
| service_type | TEXT | 维修服务、清洁服务、工程改造 |
| status | TEXT | pending, assigned, in_progress, completed, cancelled |
| description | TEXT | 描述 |
| audio_url | TEXT | 语音报修 |
| device_id | TEXT | 设备ID |
| assigned_to | TEXT/UUID | 分配工人 |
| amount | DECIMAL | 维修金额 |
| company_id | UUID | 多租户 |
| created_at, updated_at | TIMESTAMPTZ | |

**RLS**: 有修复脚本（20250125_fix_repair_orders_rls 等），以 migrations 为准。

---

### 1.3 restaurants（餐厅）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | TEXT | 餐厅名 |
| user_id | UUID | 关联用户 |
| company_id | UUID | 多租户，FK → companies |
| contact_name, contact_phone | TEXT | |
| address | TEXT | |
| latitude, longitude | NUMERIC | 坐标 |
| status | TEXT | 已激活等 |
| qr_token | TEXT | 扫码入店 |
| credit_line | DECIMAL | 授信额度（元），0 表示不授信 |
| customer_type | TEXT | individual \| enterprise |
| created_at, updated_at | TIMESTAMPTZ | |

**RLS**: Service role 全访问；Users can access their own restaurant。

---

### 1.4 workers（工人）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name, phone | TEXT | |
| worker_type | TEXT/JSON | delivery, repair, install |
| product_types | TEXT/JSON | lpg, clean 等（配送员） |
| status | TEXT | active, 在线 等 |
| company_id | UUID | 多租户 |
| created_at, updated_at | TIMESTAMPTZ | |

---

### 1.5 devices（设备）

| 字段 | 类型 | 说明 |
|------|------|------|
| device_id | TEXT | 主键（二维码值） |
| restaurant_id | UUID | 餐厅 |
| status | TEXT | active, online, offline |
| model, address, installer | TEXT | |
| install_date | TIMESTAMPTZ | |
| is_locked | BOOLEAN | |
| company_id | UUID | 多租户 |
| equipment_catalog_id | UUID | 可选，FK → equipment_catalog |
| created_at, updated_at | TIMESTAMPTZ | |

---

## 二、多租户与权限表

### 2.1 companies（公司）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | TEXT | 公司名 |
| status | TEXT | |
| bank_name | TEXT | 开户行名称（对公收款） |
| bank_account | TEXT | 银行账号（对公收款） |
| tax_id | TEXT | 纳税人识别号 |
| created_at, updated_at | TIMESTAMPTZ | |

**RLS**: Service role 全访问。  
**对公支付**：客户下单时通过 restaurant → company 拉取收款账户，多租户白标化。

---

### 2.2 user_companies（用户-公司关联）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | FK → auth.users |
| company_id | UUID | FK → companies |
| role | VARCHAR | member, admin, owner |
| is_primary | BOOLEAN | 主公司 |
| created_at, updated_at | TIMESTAMPTZ | |
| UNIQUE(user_id, company_id) | | |

**用途**: platform_admin/company_admin 的 companyId 来源。

---

### 2.3 user_roles（用户角色）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | FK → auth.users |
| role | TEXT | super_admin, platform_admin, company_admin, admin, staff, factory, filler |
| created_at, updated_at | TIMESTAMPTZ | |

**RLS**: Service role 全访问；Users can view own role；Admins can view/insert/update/delete all。

---

### 2.4 company_permissions（公司功能权限）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| company_id | UUID | FK → companies |
| permission_key | TEXT | restaurants, orders, repairs 等 |
| enabled | BOOLEAN | |
| created_at, updated_at | TIMESTAMPTZ | |
| UNIQUE(company_id, permission_key) | | |

**用途**: 供应商左侧导航显示哪些菜单。

---

### 2.5 company_fuel_types（公司燃料品种）

| 字段 | 类型 | 说明 |
|------|------|------|
| company_id | UUID | |
| fuel_type | TEXT | |
| enabled | BOOLEAN | |

---

## 三、设备租赁相关表

### 3.1 rental_orders

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| order_number | TEXT | 订单号 |
| restaurant_id | UUID | |
| equipment_id | UUID | FK → equipment |
| provider_id | UUID | 供应商，FK → companies |
| quantity, rental_period | INTEGER | |
| start_date, end_date | DATE | |
| monthly_rental_price, total_amount, deposit_amount | DECIMAL | |
| payment_status, order_status | TEXT | |
| company_id | UUID | 多租户 |
| created_at, updated_at | TIMESTAMPTZ | |

---

### 3.2 device_rentals

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| device_id | TEXT | FK → devices |
| rental_contract_id | UUID | 可选 |
| agreement_id | UUID | 可选 |
| status | TEXT | active, ended |
| unit_price, total_asset_value | DECIMAL | 可选 |
| start_at, end_at | TIMESTAMPTZ | |
| company_id | UUID | 多租户 |
| created_at, updated_at | TIMESTAMPTZ | |

**RLS**: company_isolation（基于 user_companies）；Service role 全访问。

---

### 3.3 equipment_catalog, equipment_categories, equipment

设备分类与产品目录，含 provider_id/company_id 支持多租户。

---

### 3.4 rental_contracts, rental_contract_devices

租赁合同及合同-设备关联。

---

### 3.5 rental_billing_cycles, rental_deposits, rental_events

账期、押金、租赁事件。

---

## 四、事实与审计表

### 4.1 audit_logs

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| actor_id | UUID | 操作人 |
| action | TEXT | ORDER_ACCEPTED, PLATFORM_DISPATCH_ALLOCATE, VOUCHER_UPLOADED, CORPORATE_PAYMENT_CONFIRMED 等 |
| target_type | TEXT | delivery_order, repair_order 等 |
| target_id | UUID | |
| metadata | JSONB | 扩展信息；对公凭证上传含 uploader_ip, uploader_lat, uploader_lon, uploaded_at |
| created_at | TIMESTAMPTZ | |

---

### 4.2 trace_logs

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| asset_id | TEXT | 资产ID |
| operator_id | UUID | 操作人 |
| action_type | TEXT | ASSET_DELIVERED 等 |
| order_id | UUID | 关联订单 |
| created_at | TIMESTAMPTZ | |

---

### 4.3 gas_cylinders

资产表（气瓶等），用于溯源。

---

## 五、其他表

| 表名 | 用途 |
|------|------|
| order_main | 订单主表（统一订单视图） |
| agreements | 协议（含 company_id 隔离） |
| notifications | 通知 |
| fuel_prices | 燃料价格 |
| fuel_level | IoT 燃料级别 |
| service_points | 服务点 |
| usage_snapshots | 用量快照 |
| device_ownerships | 设备归属 |

---

## 六、RLS 策略现状摘要

| 表 | RLS 状态 | 策略要点 |
|----|----------|----------|
| companies | 启用 | Service role 全访问 |
| restaurants | 启用 | Service role 全访问；用户可访问自己的餐厅 |
| user_roles | 启用 | Service role 全访问；用户可查自己的角色；管理员可管理全部 |
| user_companies | 启用 | 见修复脚本（修复创建供应商权限问题.sql 等） |
| device_rentals | 启用 | company_isolation + Service role |
| delivery_orders | 视迁移而定 | 多数 API 使用 Service Role |
| repair_orders | 有修复脚本 | 见 20250125_fix_repair_orders_rls |
| agreements | 启用 | company 隔离策略 |

**说明**: 多租户隔离主要在**应用层**通过 `getUserContext` + `companyId` 实现，API 使用 Service Role 查询后按 company_id/restaurant_id/provider_id 过滤。RLS 作为补充防线。
