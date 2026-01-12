# 事实驱动架构流程文档

## 架构流程

```
数据真实发生
   ↓
事实数据库（orders / trace_logs / assets）
   ↓
事实聚合接口（只读、可复核）
   ↓
事实可视化组件（时间线 / 状态 / 对应关系）
```

## 一、事实数据库层

### 1.1 订单事实（Orders）
- **表名**: `delivery_orders`
- **用途**: 记录所有订单的真实状态变化
- **关键字段**:
  - `id`: 订单唯一标识
  - `status`: 订单状态（pending, active, delivering, completed, exception, cancelled）
  - `restaurant_id`: 餐厅ID
  - `worker_id`: 配送员ID
  - `created_at`: 创建时间
  - `updated_at`: 更新时间

### 1.2 溯源事实（Trace Logs）
- **表名**: `trace_logs`
- **用途**: 记录资产（如气瓶）的完整生命周期轨迹
- **关键字段**:
  - `asset_id`: 资产ID
  - `operator_id`: 操作人ID
  - `action_type`: 操作类型（FACTORY_OUT, FILLING, DELIVERY, RETURN, REPAIR）
  - `order_id`: 关联订单ID
  - `created_at`: 操作时间

### 1.3 审计事实（Audit Logs）
- **表名**: `audit_logs`
- **用途**: 记录所有关键操作的可复核记录
- **关键字段**:
  - `actor_id`: 操作人ID
  - `action`: 操作类型（ORDER_CREATE, ORDER_EXCEPTION, OPS_QUERY 等）
  - `target_type`: 目标类型（order, asset, ops_overview 等）
  - `target_id`: 目标ID
  - `metadata`: 操作元数据（JSON）
  - `created_at`: 操作时间

### 1.4 资产事实（Assets）
- **表名**: `gas_cylinders` / `devices`
- **用途**: 记录资产的基本信息和当前状态
- **关键字段**:
  - `device_id` / `asset_id`: 资产唯一标识
  - `restaurant_id`: 绑定餐厅ID
  - `status`: 资产状态（active, inactive, maintenance）
  - `created_at`: 创建时间

## 二、事实聚合接口层

### 2.1 核心原则

1. **只读（Read-Only）**
   - 所有事实聚合接口都是 GET 请求
   - 不修改事实数据库
   - 只进行查询和聚合计算

2. **可复核（Auditable）**
   - 所有查询操作都记录 `audit_logs`（`action_type = OPS_QUERY`）
   - 记录查询人、查询时间、查询参数
   - 支持后续审计追溯

3. **数据来源明确**
   - 接口注释中明确标注数据来源表
   - 例如：`数据来源：audit_logs + delivery_orders`

### 2.2 现有接口

#### `/api/ops/overview` - 运营总览
- **数据来源**: `delivery_orders` + `audit_logs`
- **用途**: 聚合订单统计、效率指标、配送员行为指标
- **特点**: 
  - 只读操作
  - 记录 `audit_logs`（`action = OPS_QUERY`, `target_type = ops_overview`）
  - 默认统计最近 7 天（可通过 `?days=7` 参数调整）

#### `/api/ops/exceptions` - 异常订单监控
- **数据来源**: `audit_logs + delivery_orders`
- **用途**: 聚合当前处于异常状态的订单及其异常原因
- **特点**:
  - 只读操作
  - 记录 `audit_logs`（`action = OPS_QUERY`, `target_type = ops_exceptions`）
  - 返回当前仍处于 `exception` 状态的订单

#### `/api/trace/query/[asset_id]` - 资产溯源查询
- **数据来源**: `trace_logs`
- **用途**: 查询指定资产的完整生命周期时间线
- **特点**:
  - 只读操作
  - 按时间倒序返回所有操作记录
  - 支持未来扩展为可复核接口

### 2.3 接口设计规范

```typescript
/**
 * 接口名称
 * 阶段：阶段标识
 * 
 * GET /api/xxx
 * 
 * 数据来源：表名1 + 表名2
 * 用途：说明
 * 
 * 权限：说明（记录 audit_logs）
 */
export async function GET(request: Request) {
  // 1. 权限判断（如需要）
  // 2. 从事实数据库查询
  // 3. 聚合计算
  // 4. 记录 audit_logs（action = OPS_QUERY）
  // 5. 返回结果
}
```

## 三、事实可视化组件层

### 3.1 核心原则

1. **数据来源明确**
   - 组件必须从事实聚合接口获取数据
   - 禁止硬编码数据
   - 禁止直接从数据库查询（绕过聚合层）

2. **可视化类型**
   - **时间线（Timeline）**: 展示事件的时间顺序，如订单状态变化、资产溯源记录
   - **状态（Status）**: 展示当前状态，如订单状态、资产状态
   - **对应关系（Mapping）**: 展示实体间的关联关系，如订单-资产、订单-配送员

3. **事实表达**
   - 组件显示的是"现实状态的投影"
   - 所有数据都基于事实数据库的真实记录
   - 不支持"离线"等假数据（除非来自 `fact_unavailable_reason`）

### 3.2 组件分类

#### 时间线组件（Timeline Components）
- `FactTimeline` - 通用事实时间线
  - 输入: `fact_type`（order, asset, audit）
  - 数据来源: `/api/trace/query/[asset_id]` 或 `/api/orders/[order_id]/timeline`
  - 展示: 按时间顺序展示所有事实记录

- `OrderTimeline` - 订单时间线
  - 数据来源: `/api/orders/[order_id]/timeline`
  - 展示: 订单状态变化时间线

- `AssetTraceTimeline` - 资产溯源时间线
  - 数据来源: `/api/trace/query/[asset_id]`
  - 展示: 资产生命周期时间线

#### 状态组件（Status Components）
- `OrderStatus` - 订单状态
  - 数据来源: `/api/orders/[order_id]`
  - 展示: 当前订单状态及其对应关系

- `AssetStatus` - 资产状态
  - 数据来源: `/api/assets/[asset_id]`
  - 展示: 当前资产状态及其绑定关系

#### 对应关系组件（Mapping Components）
- `OrderAssetMapping` - 订单-资产对应关系
  - 数据来源: `/api/orders/[order_id]` + `/api/trace/query/[asset_id]`
  - 展示: 订单关联的资产及其状态

- `OrderWorkerMapping` - 订单-配送员对应关系
  - 数据来源: `/api/orders/[order_id]` + `/api/workers/[worker_id]`
  - 展示: 订单关联的配送员及其行为

### 3.3 现有组件状态

#### ✅ 符合架构的组件
- 无（当前所有组件都使用硬编码数据）

#### ❌ 需要重构的组件
- `components/order-list.tsx` - 使用硬编码数据，需要从 `/api/orders` 获取
- `components/recent-orders.tsx` - 使用硬编码数据，需要从 `/api/orders?recent=true` 获取
- `components/order-status.tsx` - 需要确认是否从事实接口获取数据

#### ⚠️ 需要创建的组件
- `components/fact-timeline.tsx` - 通用事实时间线组件
- `components/order-timeline.tsx` - 订单时间线组件
- `components/asset-trace-timeline.tsx` - 资产溯源时间线组件
- `components/order-asset-mapping.tsx` - 订单-资产对应关系组件

## 四、实现检查清单

### 4.1 事实数据库层
- [x] `delivery_orders` 表已创建
- [x] `trace_logs` 表已创建
- [x] `audit_logs` 表已创建
- [x] `gas_cylinders` / `devices` 表已创建
- [ ] 所有表都有 `created_at` 和 `updated_at` 字段
- [ ] 所有表都支持软删除或硬删除策略

### 4.2 事实聚合接口层
- [x] `/api/ops/overview` 已实现（只读、可复核）
- [x] `/api/ops/exceptions` 已实现（只读、可复核）
- [x] `/api/trace/query/[asset_id]` 已实现（只读）
- [ ] `/api/orders` - 订单列表接口（需要创建）
- [ ] `/api/orders/[order_id]` - 订单详情接口（需要创建）
- [ ] `/api/orders/[order_id]/timeline` - 订单时间线接口（需要创建）
- [ ] `/api/assets/[asset_id]` - 资产详情接口（需要创建）
- [ ] 所有接口都记录 `audit_logs`

### 4.3 事实可视化组件层
- [ ] `OrderList` - 从 `/api/orders` 获取数据（待重构）
- [ ] `RecentOrders` - 从 `/api/orders?recent=true` 获取数据（待重构）
- [ ] `OrderStatus` - 从 `/api/orders/[order_id]` 获取数据（待检查）
- [ ] `FactTimeline` - 通用事实时间线组件（待创建）
- [ ] `OrderTimeline` - 订单时间线组件（待创建）
- [ ] `AssetTraceTimeline` - 资产溯源时间线组件（待创建）
- [ ] `OrderAssetMapping` - 订单-资产对应关系组件（待创建）

## 五、下一步工作

### 5.1 立即任务（高优先级）
1. 创建 `/api/orders` 接口 - 订单列表（只读、可复核）
2. 重构 `components/order-list.tsx` - 从事实接口获取数据
3. 重构 `components/recent-orders.tsx` - 从事实接口获取数据

### 5.2 中期任务（中优先级）
1. 创建 `/api/orders/[order_id]` 接口 - 订单详情
2. 创建 `/api/orders/[order_id]/timeline` 接口 - 订单时间线
3. 创建 `components/fact-timeline.tsx` - 通用事实时间线组件
4. 创建 `components/order-timeline.tsx` - 订单时间线组件

### 5.3 长期任务（低优先级）
1. 创建 `/api/assets/[asset_id]` 接口 - 资产详情
2. 创建 `components/asset-trace-timeline.tsx` - 资产溯源时间线组件
3. 创建 `components/order-asset-mapping.tsx` - 订单-资产对应关系组件
4. 完善所有接口的 `audit_logs` 记录

## 六、架构优势

1. **可追溯性（Traceability）**
   - 所有数据都可以追溯到事实数据库
   - 支持审计和复核

2. **一致性（Consistency）**
   - 所有可视化都基于同一事实源
   - 避免数据不一致

3. **可维护性（Maintainability）**
   - 清晰的层次结构
   - 易于扩展和维护

4. **可复核性（Auditability）**
   - 所有查询操作都有记录
   - 支持后续审计
