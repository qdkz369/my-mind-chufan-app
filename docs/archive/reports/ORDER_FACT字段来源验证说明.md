# ORDER_FACT 字段来源验证说明

## ✅ 代码已更新

**文件：** `app/api/facts/orders/[order_id]/route.ts`

**添加位置：** 第 275-295 行（在 return 语句之前）

**添加内容：**
1. 输出完整的 orderFact 对象（第 278 行）
2. 输出字段来源说明（第 279-287 行）
3. 输出字段存在性检查（第 288-297 行）

---

## 📋 字段来源说明

### 字段来源映射

根据代码逻辑（第 179-187 行），`orderFact` 对象的字段来源如下：

| 字段名 | 来源表 | 代码位置 | 说明 |
|--------|--------|---------|------|
| `order_id` | `delivery_orders` | 第 180 行 | `orderData.id` |
| `restaurant_id` | `delivery_orders` | 第 181 行 | `orderData.restaurant_id` |
| `status` | `delivery_orders` | 第 182 行 | `orderData.status` |
| `created_at` | `delivery_orders` | 第 183 行 | `orderData.created_at` |
| `worker_id` | `delivery_orders` | 第 184 行 | `orderData.worker_id` |
| `accepted_at` | `audit_logs` | 第 185 行 | 从 audit_logs 查询 ORDER_ACCEPTED/ORDER_ACCEPT 的 created_at |
| `completed_at` | `audit_logs` | 第 186 行 | 从 audit_logs 查询 ORDER_COMPLETED/ORDER_COMPLETE 的 created_at |

---

## 📊 预期输出格式

### 1. ORDER_FACT_RETURN（完整的 orderFact 对象）

```
ORDER_FACT_RETURN {
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "restaurant_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "created_at": "2025-01-18T08:30:00.000Z",
  "worker_id": "987e6543-e21b-34c5-d678-912345678901",
  "accepted_at": "2025-01-18T09:15:00.000Z",
  "completed_at": "2025-01-18T14:35:00.000Z"
}
```

---

### 2. ORDER_FACT_FIELD_SOURCES（字段来源说明）

```
ORDER_FACT_FIELD_SOURCES {
  "order_id": "来自 delivery_orders.id",
  "restaurant_id": "来自 delivery_orders.restaurant_id",
  "status": "来自 delivery_orders.status",
  "created_at": "来自 delivery_orders.created_at",
  "worker_id": "来自 delivery_orders.worker_id",
  "accepted_at": "来自 audit_logs (ORDER_ACCEPTED/ORDER_ACCEPT 的 created_at)",
  "completed_at": "来自 audit_logs (ORDER_COMPLETED/ORDER_COMPLETE 的 created_at)"
}
```

---

### 3. ORDER_FACT_FIELDS_CHECK（字段存在性检查）

#### 情况 1：所有字段都存在

```
ORDER_FACT_FIELDS_CHECK {
  "created_at_exists": true,
  "accepted_at_exists": true,
  "completed_at_exists": true,
  "status_exists": true,
  "created_at_value": "2025-01-18T08:30:00.000Z",
  "accepted_at_value": "2025-01-18T09:15:00.000Z",
  "completed_at_value": "2025-01-18T14:35:00.000Z",
  "status_value": "completed"
}
```

---

#### 情况 2：accepted_at 不存在（undefined）

```
ORDER_FACT_FIELDS_CHECK {
  "created_at_exists": true,
  "accepted_at_exists": false,
  "completed_at_exists": true,
  "status_exists": true,
  "created_at_value": "2025-01-18T08:30:00.000Z",
  "accepted_at_value": null,
  "completed_at_value": "2025-01-18T14:35:00.000Z",
  "status_value": "completed"
}
```

---

#### 情况 3：completed_at 不存在（undefined）

```
ORDER_FACT_FIELDS_CHECK {
  "created_at_exists": true,
  "accepted_at_exists": true,
  "completed_at_exists": false,
  "status_exists": true,
  "created_at_value": "2025-01-18T08:30:00.000Z",
  "accepted_at_value": "2025-01-18T09:15:00.000Z",
  "completed_at_value": null,
  "status_value": "completed"
}
```

---

#### 情况 4：两个字段都不存在（undefined）

```
ORDER_FACT_FIELDS_CHECK {
  "created_at_exists": true,
  "accepted_at_exists": false,
  "completed_at_exists": false,
  "status_exists": true,
  "created_at_value": "2025-01-18T08:30:00.000Z",
  "accepted_at_value": null,
  "completed_at_value": null,
  "status_value": "completed"
}
```

---

## ✅ 验证检查清单

根据控制台输出，检查以下字段是否真实存在：

### 1. order.created_at

**检查：**
- 查看 `ORDER_FACT_FIELDS_CHECK.created_at_exists`
- 查看 `ORDER_FACT_FIELDS_CHECK.created_at_value`

**预期：**
- ✅ **应该存在**（从 delivery_orders.created_at 获取）
- ✅ **值应该是有效的 ISO 8601 时间戳**

**来源：**
- ✅ **来自 delivery_orders 表**（第 183 行：`orderData.created_at`）

---

### 2. order.accepted_at

**检查：**
- 查看 `ORDER_FACT_FIELDS_CHECK.accepted_at_exists`
- 查看 `ORDER_FACT_FIELDS_CHECK.accepted_at_value`

**预期：**
- ⚠️ **可能不存在**（如果 audit_logs 中没有 ORDER_ACCEPTED/ORDER_ACCEPT 记录，则为 undefined）
- ✅ **如果存在，应该是有效的 ISO 8601 时间戳**

**来源：**
- ✅ **来自 audit_logs 表**（从 ORDER_ACCEPTED 或 ORDER_ACCEPT 动作的 created_at 提取）
- ⚠️ **如果不存在**，字段值为 `undefined`（不是 null）

---

### 3. order.completed_at

**检查：**
- 查看 `ORDER_FACT_FIELDS_CHECK.completed_at_exists`
- 查看 `ORDER_FACT_FIELDS_CHECK.completed_at_value`

**预期：**
- ⚠️ **可能不存在**（如果 audit_logs 中没有 ORDER_COMPLETED/ORDER_COMPLETE 记录，则为 undefined）
- ✅ **如果存在，应该是有效的 ISO 8601 时间戳**

**来源：**
- ✅ **来自 audit_logs 表**（从 ORDER_COMPLETED 或 ORDER_COMPLETE 动作的 created_at 提取）
- ⚠️ **如果不存在**，字段值为 `undefined`（不是 null）

---

### 4. order.status

**检查：**
- 查看 `ORDER_FACT_FIELDS_CHECK.status_exists`
- 查看 `ORDER_FACT_FIELDS_CHECK.status_value`

**预期：**
- ✅ **应该存在**（从 delivery_orders.status 获取）
- ✅ **值应该是有效的订单状态**（pending, accepted, delivering, completed, exception, rejected, cancelled）

**来源：**
- ✅ **来自 delivery_orders 表**（第 182 行：`orderData.status`）

---

## 📝 字段来源总结

### 来自 delivery_orders 表的字段

| 字段名 | 说明 |
|--------|------|
| `order_id` | 订单ID（主键） |
| `restaurant_id` | 餐厅ID |
| `status` | 订单状态 |
| `created_at` | 订单创建时间 |
| `worker_id` | 配送员ID（可选） |

**代码位置：** 第 52-56 行（查询 delivery_orders 表）

---

### 来自 audit_logs 表的字段

| 字段名 | 说明 | 提取逻辑 |
|--------|------|---------|
| `accepted_at` | 订单接单时间（可选） | 从 audit_logs 中查询 action = "ORDER_ACCEPTED" 或 "ORDER_ACCEPT" 的记录，提取 created_at |
| `completed_at` | 订单完成时间（可选） | 从 audit_logs 中查询 action = "ORDER_COMPLETED" 或 "ORDER_COMPLETE" 的记录，提取 created_at |

**代码位置：** 第 97-165 行（查询 audit_logs 表并提取时间）

**注意：**
- 这两个字段是**可选的**（可能为 undefined）
- 如果 audit_logs 中没有对应的记录，字段值为 `undefined`
- 字段值来自 audit_logs 的 `created_at` 字段，不是 delivery_orders 表的字段

---

## 🔍 字段完整性检查

### 必须存在的字段

以下字段应该总是存在（来自 delivery_orders 表）：

- ✅ `order_id` - 订单ID
- ✅ `restaurant_id` - 餐厅ID
- ✅ `status` - 订单状态
- ✅ `created_at` - 订单创建时间

---

### 可能不存在的字段

以下字段可能不存在（来自 audit_logs 表，如果 audit_logs 中没有对应记录则为 undefined）：

- ⚠️ `accepted_at` - 订单接单时间（如果 audit_logs 中没有 ORDER_ACCEPTED/ORDER_ACCEPT 记录）
- ⚠️ `completed_at` - 订单完成时间（如果 audit_logs 中没有 ORDER_COMPLETED/ORDER_COMPLETE 记录）
- ⚠️ `worker_id` - 配送员ID（如果订单未被接单）

---

## ✅ 验证结果记录模板

```
订单 ID: _________________

ORDER_FACT_RETURN: {
  "order_id": _________________,
  "restaurant_id": _________________,
  "status": _________________,
  "created_at": _________________,
  "accepted_at": _________________,
  "completed_at": _________________,
  "worker_id": _________________
}

字段存在性检查：
1. order.created_at
   [ ] 存在
   [ ] 不存在
   值：_________________
   来源：_________________

2. order.accepted_at
   [ ] 存在
   [ ] 不存在（undefined）
   值：_________________
   来源：_________________

3. order.completed_at
   [ ] 存在
   [ ] 不存在（undefined）
   值：_________________
   来源：_________________

4. order.status
   [ ] 存在
   [ ] 不存在
   值：_________________
   来源：_________________

字段来源总结：
- 来自 delivery_orders：order_id, restaurant_id, status, created_at, worker_id
- 来自 audit_logs：accepted_at, completed_at
```

---

## 🔍 如果发现问题

### 问题 1：created_at 不存在

**可能原因：**
- delivery_orders 表中该订单没有 created_at 字段
- 数据库查询错误

**建议：**
- 检查 delivery_orders 表结构
- 检查数据库查询是否成功

---

### 问题 2：status 不存在

**可能原因：**
- delivery_orders 表中该订单没有 status 字段
- 数据库查询错误

**建议：**
- 检查 delivery_orders 表结构
- 检查数据库查询是否成功

---

### 问题 3：accepted_at 或 completed_at 不存在

**这是正常的**，如果：
- audit_logs 中没有对应的记录

**如果应该存在但不存在，可能原因：**
- audit_logs 中没有写入 ORDER_ACCEPTED/ORDER_COMPLETED 记录
- action 名称不匹配（参考指令 2 的 FACT_TIMES 输出）

**建议：**
- 检查指令 1 的 AUDIT_LOGS_RAW 输出
- 检查指令 2 的 FACT_TIMES 输出
- 确认 audit_logs 中是否有对应的记录

---

**生成时间：** 2025-01-20  
**代码位置：** `app/api/facts/orders/[order_id]/route.ts` 第 275-297 行
