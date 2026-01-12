# 事实治理层（Fact Governance Layer）实现结果

## 一、order.fact.guard.ts 内容

文件路径：`lib/facts/governance/order.fact.guard.ts`

已创建并实现 `OrderFactGuard` 函数，包含以下检查：

1. **检查 1：accepted_at 存在但 audit_logs 中无对应记录**
   - 验证 `order.accepted_at` 是否在 `audit_logs` 中有对应的 `ORDER_ACCEPTED` 或 `ORDER_ACCEPT` 记录
   - 如果存在但无记录，记录警告

2. **检查 2：completed_at 早于 created_at**
   - 验证时间逻辑，确保 `completed_at` 不早于 `created_at`
   - 如果违反，记录警告

3. **检查 3：trace.action_type 不在允许枚举内**
   - 验证 `trace.action_type` 是否在允许的枚举值内（`ASSET_CREATED`, `ASSET_FILLED`, `ASSET_DELIVERED`, `ASSET_RETURNED`, `ASSET_INSPECTED`）
   - 如果不在，记录警告

4. **检查 4：trace.created_at 早于 order.created_at 且无明确说明**
   - 验证时间线逻辑
   - 如果 `trace.order_id === order.order_id` 且 `trace.created_at < order.created_at`，记录警告（时间线断裂）
   - 如果 `trace.order_id` 为空或不同，记录低优先级警告（可能是订单创建前的资产操作）

所有警告都会记录到 `error log`，但**不会阻断 API 响应**。

---

## 二、API 返回示例（含 fact_warnings）

### 示例 1：正常情况（无警告）

```json
{
  "success": true,
  "order": {
    "order_id": "123e4567-e89b-12d3-a456-426614174000",
    "restaurant_id": "987e6543-e21b-12d3-a456-426614174000",
    "status": "completed",
    "created_at": "2024-01-20T10:00:00Z",
    "accepted_at": "2024-01-20T10:05:00Z",
    "completed_at": "2024-01-20T12:00:00Z",
    "worker_id": "worker-123"
  },
  "assets": [
    {
      "asset_id": "asset-001",
      "status": "delivered",
      "last_action": "ASSET_DELIVERED",
      "last_action_at": "2024-01-20T12:00:00Z"
    }
  ],
  "traces": [
    {
      "id": "trace-001",
      "asset_id": "asset-001",
      "action_type": "ASSET_DELIVERED",
      "operator_id": "operator-123",
      "order_id": "123e4567-e89b-12d3-a456-426614174000",
      "created_at": "2024-01-20T12:00:00Z"
    }
  ]
}
```

**注意**：如果没有警告，`fact_warnings` 字段不会出现在响应中。

### 示例 2：存在警告的情况

```json
{
  "success": true,
  "order": {
    "order_id": "123e4567-e89b-12d3-a456-426614174000",
    "restaurant_id": "987e6543-e21b-12d3-a456-426614174000",
    "status": "completed",
    "created_at": "2024-01-20T10:00:00Z",
    "accepted_at": "2024-01-20T10:05:00Z",
    "completed_at": "2024-01-20T09:00:00Z",
    "worker_id": "worker-123"
  },
  "assets": [
    {
      "asset_id": "asset-001",
      "status": "delivered",
      "last_action": "ASSET_DELIVERED",
      "last_action_at": "2024-01-20T12:00:00Z"
    }
  ],
  "traces": [
    {
      "id": "trace-001",
      "asset_id": "asset-001",
      "action_type": "INVALID_ACTION",
      "operator_id": "operator-123",
      "order_id": "123e4567-e89b-12d3-a456-426614174000",
      "created_at": "2024-01-20T09:30:00Z"
    }
  ],
  "fact_warnings": [
    "违反事实契约：order.completed_at（2024-01-20T09:00:00Z）早于 order.created_at（2024-01-20T10:00:00Z）。时间逻辑异常。",
    "违反事实契约：traces[0].action_type（INVALID_ACTION）不在允许的枚举值内。允许的值：ASSET_CREATED, ASSET_FILLED, ASSET_DELIVERED, ASSET_RETURNED, ASSET_INSPECTED。",
    "违反事实契约：traces[0].created_at（2024-01-20T09:30:00Z）早于 order.created_at（2024-01-20T10:00:00Z），但该追溯记录关联了当前订单（order_id=123e4567-e89b-12d3-a456-426614174000）。时间线断裂。"
  ]
}
```

### 示例 3：accepted_at 存在但 audit_logs 无记录

```json
{
  "success": true,
  "order": {
    "order_id": "123e4567-e89b-12d3-a456-426614174000",
    "restaurant_id": "987e6543-e21b-12d3-a456-426614174000",
    "status": "accepted",
    "created_at": "2024-01-20T10:00:00Z",
    "accepted_at": "2024-01-20T10:05:00Z",
    "completed_at": null,
    "worker_id": "worker-123"
  },
  "assets": [],
  "traces": [],
  "fact_warnings": [
    "违反事实契约：order.accepted_at 存在（2024-01-20T10:05:00Z），但 audit_logs 中无对应的 ORDER_ACCEPTED/ORDER_ACCEPT 记录。可能存在数据不一致。"
  ]
}
```

---

## 三、为何这是"治理"而不是"校验"？

### 核心区别

| 维度 | 校验（Validation） | 治理（Governance） |
|------|-------------------|-------------------|
| **时机** | 数据进入系统前 | 数据返回给调用方前 |
| **目的** | 确保数据格式正确、必填项完整 | 暴露数据质量问题、事实不一致 |
| **行为** | 不符合则拒绝（返回错误） | 不符合则记录警告，但仍返回数据 |
| **影响** | 阻断流程 | 不阻断流程，但显性暴露问题 |
| **修复** | 由调用方修复后重新提交 | 由数据管理员或系统修复，UI 层只展示 |

### 具体说明

#### 1. **校验（Validation）**
- **场景**：用户提交表单时，检查 `order_id` 是否为空、`status` 是否在允许值内
- **行为**：如果 `order_id` 为空，返回 `400 Bad Request`，拒绝请求
- **目的**：防止无效数据进入系统
- **修复**：用户修正表单后重新提交

#### 2. **治理（Governance）**
- **场景**：API 返回订单事实时，检查 `accepted_at` 是否在 `audit_logs` 中有对应记录
- **行为**：如果 `accepted_at` 存在但 `audit_logs` 无记录，记录警告到 `fact_warnings`，但仍返回数据
- **目的**：暴露数据质量问题，让调用方知道"数据有问题"，但不阻止展示
- **修复**：由数据管理员修复数据库，或由系统自动修复（如数据迁移脚本）

### 为什么需要"治理"而不是"校验"？

1. **事实驱动架构的核心原则**：
   - UI 层只能展示事实，不能修复或推断
   - 如果数据有问题，必须显性暴露，而不是隐藏或推断

2. **数据质量问题可能来自历史数据**：
   - 旧系统迁移的数据可能不完整
   - 手动修改数据库可能导致不一致
   - 系统 bug 可能导致数据异常
   - 这些情况下，**不能拒绝返回数据**，因为用户需要看到"当前状态"

3. **渐进式修复**：
   - 治理层暴露问题后，数据管理员可以逐步修复
   - UI 层可以显示警告，提醒用户"数据可能有问题"
   - 系统可以记录到监控系统，触发告警

4. **透明性**：
   - 所有异常事实必须显性暴露
   - 调用方（前端、其他服务）可以决定如何处理警告
   - 不会因为"数据有问题"就完全拒绝展示

### 实际应用场景

**场景 1：accepted_at 存在但 audit_logs 无记录**
- **校验**：如果这是新订单创建，校验会拒绝（因为格式不对）
- **治理**：如果这是历史数据，治理会记录警告，但仍返回数据，让用户看到"订单显示已接单，但审计日志中没有记录"

**场景 2：completed_at 早于 created_at**
- **校验**：如果这是新订单，校验会拒绝（因为逻辑不对）
- **治理**：如果这是历史数据，治理会记录警告，但仍返回数据，让用户看到"订单完成时间早于创建时间，可能存在数据错误"

**场景 3：trace.action_type 不在允许枚举内**
- **校验**：如果这是新追溯记录，校验会拒绝（因为枚举值不对）
- **治理**：如果这是历史数据，治理会记录警告，但仍返回数据，让用户看到"追溯记录的操作类型不在允许范围内，可能需要更新"

### 总结

**治理层的作用**：
- ✅ 暴露数据质量问题
- ✅ 显性告知调用方"数据有问题"
- ✅ 不阻断 API 响应
- ✅ 支持渐进式修复

**校验层的作用**：
- ✅ 确保新数据格式正确
- ✅ 防止无效数据进入系统
- ✅ 阻断无效请求

两者互补，共同确保数据质量和系统稳定性。

---

## 四、实现位置

- **治理层文件**：`lib/facts/governance/order.fact.guard.ts`
- **API 集成**：`app/api/facts/orders/[order_id]/route.ts`（第 304-316 行）
- **返回结构**：`/api/facts/orders/:order_id` 响应中包含 `fact_warnings?: string[]`

---

## 五、使用说明

### 前端处理 fact_warnings

前端可以在接收到 `fact_warnings` 时：

1. **显示警告提示**：
   ```typescript
   if (response.fact_warnings && response.fact_warnings.length > 0) {
     // 显示警告提示，但不阻止展示数据
     showWarningBanner(response.fact_warnings)
   }
   ```

2. **记录到监控系统**：
   ```typescript
   if (response.fact_warnings && response.fact_warnings.length > 0) {
     // 发送到监控系统
     logToMonitoringSystem('fact_warnings', response.fact_warnings)
   }
   ```

3. **不修复数据**：
   - ❌ 不要尝试修复 `order.accepted_at` 或 `order.completed_at`
   - ❌ 不要推断缺失的时间字段
   - ✅ 只展示事实，让用户知道"数据可能有问题"

---

## 六、完成状态

✅ 已创建 `lib/facts/governance/order.fact.guard.ts`  
✅ 已实现 `OrderFactGuard` 函数  
✅ 已集成到 `/api/facts/orders/:order_id` API  
✅ 已添加 `fact_warnings` 字段到 API 响应  
✅ 已记录所有警告到 error log  
✅ 已确保不阻断 API 响应  

**所有任务已完成！**
