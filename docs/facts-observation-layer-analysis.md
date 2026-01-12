# Facts API 观察层（Observation Layer）能力分析

本文档分析当前 `fact_warnings_structured` 字段是否足以支持进入 Observation Layer，以及需要补充哪些事实字段。

---

## 1. 按时间窗口统计

### 需求分析

**目标**：统计特定时间窗口内产生的警告数量，例如：
- "过去 24 小时内产生了多少 high 级别的警告？"
- "本周的警告趋势如何？"
- "某个时间段内，哪些订单出现了时间异常？"

### 当前结构分析

**`fact_warnings_structured` 当前字段**：
- `code`: 警告代码
- `level`: 警告级别
- `domain`: 警告领域
- `message`: 人类可读消息
- `fields`: 相关字段列表
- `evidence`: 原始值快照

**`evidence` 中可能包含的时间字段**：
- `order_created_at`: 订单创建时间
- `audit_log_created_at`: audit_logs 记录时间
- `trace_created_at`: trace_logs 记录时间

### 问题识别

**缺失字段**：`detected_at`（警告检测时间）

**问题说明**：
- `evidence` 中的时间字段是"警告涉及的时间"，不是"警告被检测到的时间"
- 无法区分"警告是什么时候被发现的"和"警告涉及的数据是什么时候产生的"
- 例如：一个订单在 2024-01-01 创建，但警告在 2024-01-10 才被检测到，当前结构无法记录检测时间

### 结论

**不足**：缺少 `detected_at` 字段

**缺失的事实字段**：
- `detected_at: string`（警告检测时间）

**字段来源**：
- 应在 Facts API 生成警告时记录当前时间（`new Date().toISOString()`）
- 这是"警告被检测到"的事实，不是从数据库读取的

---

## 2. 按风险级别聚合

### 需求分析

**目标**：按警告级别（high/medium/low）进行聚合统计，例如：
- "当前有多少 high 级别的警告？"
- "按级别分组统计警告数量"
- "健康度分数与警告级别的分布关系"

### 当前结构分析

**`fact_warnings_structured` 当前字段**：
- `level: FactWarningLevel`（'low' | 'medium' | 'high'）✓

### 结论

**充足**：`level` 字段已存在，完全支持按风险级别聚合

**无需补充字段**

---

## 3. 按对象归因（order / restaurant / worker / device）

### 需求分析

**目标**：将警告归因到具体的业务对象，例如：
- "这个餐厅的所有订单中，有多少个警告？"
- "这个配送员处理的订单中，有多少个时间异常？"
- "这个设备关联的订单中，有多少个轨迹缺失？"

### 当前结构分析

**`fact_warnings_structured` 当前字段**：
- `evidence.order_id`: 订单ID（部分警告中包含）✓
- `evidence.restaurant_id`: 餐厅ID ✗
- `evidence.worker_id`: 配送员ID ✗
- `evidence.device_id`: 设备ID ✗
- `evidence.asset_id`: 资产ID（部分警告中包含，如 trace 相关警告）✓

**`order` 对象中的字段**（API 返回的完整事实）：
- `order.restaurant_id`: 餐厅ID ✓
- `order.worker_id`: 配送员ID ✓

**`traces` 对象中的字段**（API 返回的完整事实）：
- `trace.asset_id`: 资产ID ✓
- `trace.order_id`: 关联订单ID ✓

### 问题识别

**缺失字段**：
1. `restaurant_id`: 餐厅ID（警告的直接归因对象）
2. `worker_id`: 配送员ID（警告的直接归因对象）
3. `device_id`: 设备ID（警告的直接归因对象）

**问题说明**：
- 当前 `evidence` 中只包含 `order_id`，但无法直接得到 `restaurant_id`、`worker_id`、`device_id`
- 虽然可以从 `order` 对象中获取 `restaurant_id` 和 `worker_id`，但这需要额外的关联查询
- `device_id` 需要从 `asset_id` 或 `trace` 关联查询 `devices` 表才能得到
- 在 Observation Layer 中，如果每次统计都需要关联查询，会降低性能并增加复杂度

### 结论

**不足**：缺少直接的对象ID字段

**缺失的事实字段**：
1. `restaurant_id: string`（餐厅ID）
2. `worker_id: string | null`（配送员ID，可能为空）
3. `device_id: string | null`（设备ID，可能为空）

**字段来源**：
- `restaurant_id`: 来自 `order.restaurant_id`（delivery_orders.restaurant_id）
- `worker_id`: 来自 `order.worker_id`（delivery_orders.worker_id）
- `device_id`: 需要从 `trace.asset_id` 或 `assets[].asset_id` 关联查询 `devices` 表获取 `device_id`，或从 `devices` 表直接查询（如果 `asset_id` 就是 `device_id`）

**注意**：
- 这些字段都是"事实字段"，不是推断字段
- 它们都来自数据库中的真实记录
- 可以在生成警告时从已查询的 `order`、`traces`、`assets` 对象中提取

---

## 总结：缺失的事实字段

### 1. 时间相关字段

**缺失**：`detected_at: string`

**说明**：
- 警告被检测到的时间（ISO 8601 格式）
- 用于按时间窗口统计警告
- 来源：Facts API 生成警告时的当前时间

**示例**：
```json
{
  "code": "FACT_TIME_INVERSION",
  "level": "high",
  "detected_at": "2024-01-10T10:30:00.000Z",  // ← 新增字段
  "evidence": {
    "order_id": "...",
    "created_at": "2024-01-01T08:00:00.000Z"
  }
}
```

### 2. 对象归因字段

**缺失**：
- `restaurant_id: string`
- `worker_id: string | null`
- `device_id: string | null`

**说明**：
- 用于将警告直接归因到业务对象
- 避免在 Observation Layer 中进行额外的关联查询
- 来源：从已查询的 `order`、`traces`、`assets` 对象中提取

**示例**：
```json
{
  "code": "FACT_TIME_INVERSION",
  "level": "high",
  "restaurant_id": "rest_123",      // ← 新增字段
  "worker_id": "worker_456",        // ← 新增字段
  "device_id": null,                 // ← 新增字段（如果警告不涉及设备）
  "evidence": {
    "order_id": "order_789"
  }
}
```

---

## 结论：是否可以在"不改数据库结构"的前提下进入 Observation Layer

### 答案：**可以，但需要补充事实字段**

### 理由

1. **数据库结构无需修改**：
   - 所有缺失的字段都可以从现有数据库表中获取
   - `restaurant_id`、`worker_id` 来自 `delivery_orders` 表
   - `device_id` 可以通过关联查询 `devices` 表获取（如果 `asset_id` 就是 `device_id`，则无需关联）
   - `detected_at` 是生成警告时的系统时间，不来自数据库

2. **代码层面需要修改**：
   - 在 `OrderFactGuard` 函数中，生成 `FactWarning` 时补充以下字段：
     - `detected_at`: 当前时间
     - `restaurant_id`: 从 `order.restaurant_id` 提取
     - `worker_id`: 从 `order.worker_id` 提取
     - `device_id`: 从 `traces` 或 `assets` 中提取（如果警告涉及设备）

3. **Observation Layer 能力**：
   - 补充字段后，可以支持：
     - ✅ 按时间窗口统计（使用 `detected_at`）
     - ✅ 按风险级别聚合（已有 `level`）
     - ✅ 按对象归因（使用 `restaurant_id`、`worker_id`、`device_id`）

### 实施建议

**步骤 1**：扩展 `FactWarning` 类型定义
- 添加 `detected_at: string`
- 添加 `restaurant_id: string`
- 添加 `worker_id: string | null`
- 添加 `device_id: string | null`

**步骤 2**：修改 `OrderFactGuard` 函数
- 在生成每个 `FactWarning` 时，补充上述字段
- `detected_at` 使用 `new Date().toISOString()`
- `restaurant_id` 从 `order.restaurant_id` 提取
- `worker_id` 从 `order.worker_id` 提取
- `device_id` 需要根据警告类型判断：
  - 如果警告涉及 `trace`，从 `trace.asset_id` 关联查询 `devices` 表
  - 如果警告涉及 `asset`，从 `asset.asset_id` 关联查询 `devices` 表
  - 如果警告不涉及设备，设置为 `null`

**步骤 3**：验证 Observation Layer 能力
- 按时间窗口统计：使用 `detected_at` 字段
- 按风险级别聚合：使用 `level` 字段
- 按对象归因：使用 `restaurant_id`、`worker_id`、`device_id` 字段

### 注意事项

1. **性能考虑**：
   - 如果 `device_id` 需要关联查询 `devices` 表，可能影响性能
   - 建议：如果 `asset_id` 就是 `device_id`，则无需关联查询
   - 如果必须关联查询，可以考虑在 API 层面预先查询并缓存

2. **数据一致性**：
   - `detected_at` 是"警告被检测到的时间"，不是"数据产生的时间"
   - 如果同一个订单被多次查询，可能产生多个 `detected_at` 不同的警告（如果数据异常持续存在）
   - 建议：Observation Layer 应该去重或使用"首次检测时间"

3. **向后兼容**：
   - 新增字段应该设为可选（`?`），以保持向后兼容
   - 或者：在 Observation Layer 中处理字段缺失的情况

---

## 最终结论

**可以在"不改数据库结构"的前提下进入 Observation Layer**，但需要：

1. **补充 4 个事实字段**：
   - `detected_at`: 警告检测时间（系统时间）
   - `restaurant_id`: 餐厅ID（来自 order.restaurant_id）
   - `worker_id`: 配送员ID（来自 order.worker_id）
   - `device_id`: 设备ID（需要关联查询 devices 表，或从 asset_id 直接获取）

2. **修改代码**：
   - 扩展 `FactWarning` 类型定义
   - 修改 `OrderFactGuard` 函数，在生成警告时补充上述字段

3. **无需修改数据库结构**：
   - 所有字段都可以从现有数据库表中获取或计算得出
