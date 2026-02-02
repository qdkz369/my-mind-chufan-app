# OrderTimeline 逻辑验证说明

## ✅ 代码已更新

**文件：** `components/facts/OrderTimeline.tsx`

**添加位置：** 第 73-185 行（mergeTimelineNodes 函数内部）

**添加内容：**
1. 在函数开头输出输入参数（第 74-90 行）
2. 在每个 push 之前输出节点信息（第 93、100、108、133 行）
3. 在条件判断中输出跳过原因（第 104、115 行）
4. 在 traces 为空时输出警告（第 119 行）
5. 在排序前后输出节点顺序对比（第 137、146 行）
6. 在函数结尾输出最终结果（第 154 行）

---

## 📊 预期输出格式

### 1. TIMELINE_INPUT（输入参数）

在浏览器控制台（Console）中查看，应该能看到类似以下的输出：

```
TIMELINE_INPUT {
  order: {
    order_id: "550e8400-e29b-41d4-a716-446655440000",
    status: "completed",
    created_at: "2025-01-18T08:30:00.000Z",
    accepted_at: "2025-01-18T09:15:00.000Z",
    completed_at: "2025-01-18T14:35:00.000Z",
    worker_id: "987e6543-e21b-34c5-d678-912345678901"
  },
  traces: [
    {
      id: "trace-1",
      action_type: "配送",
      created_at: "2025-01-18T11:30:00.000Z",
      operator_id: "operator-1"
    },
    {
      id: "trace-2",
      action_type: "回收",
      created_at: "2025-01-18T15:00:00.000Z",
      operator_id: "operator-1"
    }
  ],
  traces_count: 2,
  accepted_at_exists: true,
  completed_at_exists: true
}
```

---

### 2. PUSH_NODE（推送节点）

每个节点被添加到时间线之前，都会输出：

```
PUSH_NODE { type: "订单创建", node: { id: "...", type: "order_status", label: "...", timestamp: "..." } }
PUSH_NODE { type: "订单已接单", node: { id: "...", type: "order_status", label: "...", timestamp: "..." } }
PUSH_NODE { type: "订单已完成", node: { id: "...", type: "order_status", label: "...", timestamp: "..." } }
PUSH_TRACES { count: 2 }
PUSH_NODE { type: "溯源记录", index: 1, node: { id: "...", type: "trace", label: "...", timestamp: "..." } }
PUSH_NODE { type: "溯源记录", index: 2, node: { id: "...", type: "trace", label: "...", timestamp: "..." } }
```

---

### 3. SKIP_NODE（跳过节点）

如果条件判断导致节点被跳过，会输出：

#### 情况 1：accepted_at 不存在

```
SKIP_NODE { type: "订单已接单", reason: "order.accepted_at 不存在（undefined）" }
```

#### 情况 2：completed_at 不存在

```
SKIP_NODE { type: "订单已完成", reason: "order.completed_at 不存在（undefined）" }
```

---

### 4. SKIP_TRACES（traces 为空）

如果 traces 数组为空，会输出警告：

```
SKIP_TRACES { reason: "traces 数组为空，可能导致 UI 看起来'没事实'" }
```

---

### 5. TIMELINE_BEFORE_SORT（排序前）

```
TIMELINE_BEFORE_SORT {
  node_count: 5,
  node_ids: [
    "order-created-...",
    "order-accepted-...",
    "order-completed-...",
    "trace-1",
    "trace-2"
  ],
  node_timestamps: [
    "2025-01-18T08:30:00.000Z",
    "2025-01-18T09:15:00.000Z",
    "2025-01-18T14:35:00.000Z",
    "2025-01-18T11:30:00.000Z",
    "2025-01-18T15:00:00.000Z"
  ]
}
```

---

### 6. TIMELINE_AFTER_SORT（排序后）

```
TIMELINE_AFTER_SORT {
  node_count: 5,
  node_ids: [
    "order-created-...",
    "order-accepted-...",
    "trace-1",
    "order-completed-...",
    "trace-2"
  ],
  node_timestamps: [
    "2025-01-18T08:30:00.000Z",
    "2025-01-18T09:15:00.000Z",
    "2025-01-18T11:30:00.000Z",
    "2025-01-18T14:35:00.000Z",
    "2025-01-18T15:00:00.000Z"
  ],
  sorted_correctly: true
}
```

**注意：** 排序后，节点按时间顺序排列（从早到晚）。`sorted_correctly` 为 `true` 表示排序正确。

---

### 7. TIMELINE_OUTPUT（最终输出）

```
TIMELINE_OUTPUT {
  total_nodes: 5,
  nodes: [
    {
      id: "order-created-...",
      type: "order_status",
      label: "订单创建：已完成",
      timestamp: "2025-01-18T08:30:00.000Z"
    },
    {
      id: "order-accepted-...",
      type: "order_status",
      label: "订单已接单",
      timestamp: "2025-01-18T09:15:00.000Z"
    },
    {
      id: "trace-1",
      type: "trace",
      label: "配送",
      timestamp: "2025-01-18T11:30:00.000Z"
    },
    {
      id: "order-completed-...",
      type: "order_status",
      label: "订单已完成",
      timestamp: "2025-01-18T14:35:00.000Z"
    },
    {
      id: "trace-2",
      type: "trace",
      label: "回收",
      timestamp: "2025-01-18T15:00:00.000Z"
    }
  ]
}
```

---

## ✅ 验证检查清单

根据浏览器控制台输出，检查以下内容：

### 1. 是否因 if (!order.accepted_at) return 导致节点丢失？

**检查：**
- 查看是否有 `SKIP_NODE` 输出，type 为 "订单已接单"
- 查看 `TIMELINE_INPUT.accepted_at_exists` 的值

**注意：**
- 代码中**没有** `if (!order.accepted_at) return` 这样的逻辑
- 代码中使用的是 `if (order.accepted_at) { nodes.push(...) }`，这是**正常的条件判断**
- 如果 `accepted_at` 不存在（undefined），节点不会被添加，这是**预期的行为**（符合"不推断"原则）

**结论：**
- ✅ **如果 accepted_at 存在**：会输出 `PUSH_NODE { type: "订单已接单", ... }`
- ⚠️ **如果 accepted_at 不存在**：会输出 `SKIP_NODE { type: "订单已接单", reason: "order.accepted_at 不存在（undefined）" }`
- ❌ **这不是"吃掉事实"**，而是"不推断"原则的体现：如果事实不存在，就不显示

---

### 2. 是否因 if (!order.completed_at) return 导致节点丢失？

**检查：**
- 查看是否有 `SKIP_NODE` 输出，type 为 "订单已完成"
- 查看 `TIMELINE_INPUT.completed_at_exists` 的值

**注意：**
- 代码中**没有** `if (!order.completed_at) return` 这样的逻辑
- 代码中使用的是 `if (order.completed_at) { nodes.push(...) }`，这是**正常的条件判断**

**结论：**
- ✅ **如果 completed_at 存在**：会输出 `PUSH_NODE { type: "订单已完成", ... }`
- ⚠️ **如果 completed_at 不存在**：会输出 `SKIP_NODE { type: "订单已完成", reason: "order.completed_at 不存在（undefined）" }`
- ❌ **这不是"吃掉事实"**，而是"不推断"原则的体现

---

### 3. 是否因时间排序被覆盖？

**检查：**
- 对比 `TIMELINE_BEFORE_SORT` 和 `TIMELINE_AFTER_SORT` 的 `node_count`
- 对比 `TIMELINE_BEFORE_SORT` 和 `TIMELINE_AFTER_SORT` 的 `node_ids`
- 查看 `TIMELINE_AFTER_SORT.sorted_correctly` 的值

**验证方法：**
1. **节点数量：** `node_count` 在排序前后应该**相同**
   - 如果不同 → **节点被覆盖或丢失**
   
2. **节点 ID：** `node_ids` 在排序前后应该包含**相同的 ID**
   - 如果不同 → **节点被覆盖或丢失**
   
3. **时间顺序：** `sorted_correctly` 应该为 `true`
   - 如果为 `false` → **排序逻辑有问题**

**注意：**
- JavaScript 的 `Array.sort()` **不会覆盖或丢失节点**，只是重新排序
- 如果 `node_count` 相同且 `node_ids` 相同，说明**没有节点被覆盖**

**结论：**
- ✅ **如果 node_count 相同且 node_ids 相同**：没有节点被覆盖，排序只是改变了顺序
- ❌ **如果 node_count 不同或 node_ids 不同**：节点被覆盖或丢失（不应该发生）

---

### 4. 是否 traces 为空导致 UI 看起来"没事实"？

**检查：**
- 查看 `TIMELINE_INPUT.traces_count` 的值
- 查看是否有 `SKIP_TRACES` 输出
- 查看 `TIMELINE_OUTPUT.total_nodes` 的值

**验证方法：**
1. **traces 数量：** `traces_count` 应该 > 0
   - 如果为 0 → **traces 为空**

2. **是否有警告：** 如果 `traces_count` 为 0，应该输出 `SKIP_TRACES` 警告

3. **最终节点数：** `total_nodes` 应该 > 0
   - 如果为 0 → **UI 会显示"暂无时间线记录"**
   - 如果为 1 → **UI 只有订单创建节点**（看起来"没事实"）

**注意：**
- 即使 `traces` 为空，`total_nodes` 也应该至少为 1（订单创建节点）
- 如果 `accepted_at` 和 `completed_at` 都不存在，且 `traces` 为空，`total_nodes` 为 1（只有订单创建节点）

**结论：**
- ✅ **如果 traces_count > 0**：traces 不为空，会有溯源记录节点
- ⚠️ **如果 traces_count = 0**：traces 为空，会输出 `SKIP_TRACES` 警告
- ⚠️ **如果 total_nodes = 1**：只有订单创建节点，UI 可能看起来"没事实"
- ⚠️ **如果 total_nodes = 0**：没有节点，UI 会显示"暂无时间线记录"（不应该发生）

---

## 🔍 如果发现问题

### 问题 1：accepted_at 或 completed_at 不存在

**可能原因：**
- API 返回的 `orderFact.accepted_at` 或 `orderFact.completed_at` 为 `undefined`
- audit_logs 中没有对应的记录

**建议：**
- 检查指令 3 的 `ORDER_FACT_RETURN` 输出
- 检查指令 4 的 `ORDER_FACT_FROM_API` 输出
- 检查指令 1 的 `AUDIT_LOGS_RAW` 输出
- 检查指令 2 的 `FACT_TIMES` 输出

**注意：**
- 这不是"吃掉事实"，而是事实本身不存在
- 如果事实不存在，就不应该显示（符合"不推断"原则）

---

### 问题 2：时间排序导致节点丢失

**可能原因：**
- `Array.sort()` 逻辑有问题（不应该发生）
- 节点 ID 冲突导致覆盖（不应该发生）

**建议：**
- 检查 `TIMELINE_BEFORE_SORT` 和 `TIMELINE_AFTER_SORT` 的 `node_count`
- 检查 `TIMELINE_BEFORE_SORT` 和 `TIMELINE_AFTER_SORT` 的 `node_ids`
- 检查 `TIMELINE_AFTER_SORT.sorted_correctly` 的值

**注意：**
- JavaScript 的 `Array.sort()` 是**原地排序**，不会丢失节点
- 如果 `node_count` 相同且 `node_ids` 相同，说明没有节点被覆盖

---

### 问题 3：traces 为空导致 UI 看起来"没事实"

**可能原因：**
- trace_logs 中没有对应的记录
- API 返回的 `traces` 数组为空

**建议：**
- 检查指令 3 的 `ORDER_FACT_RETURN` 输出（查看 `traces` 字段）
- 检查指令 4 的 `ORDER_FACT_FROM_API` 输出（查看 `traces` 字段）
- 检查数据库中是否有对应的 trace_logs 记录

**注意：**
- 如果 `traces` 为空，且 `accepted_at` 和 `completed_at` 都不存在，UI 可能看起来"没事实"
- 但这是**事实本身不存在**，不是"吃掉事实"

---

## ✅ 验证结果记录模板

```
订单 ID: _________________

浏览器控制台输出：

TIMELINE_INPUT: {
  order: { ... },
  traces: [ ... ],
  traces_count: _________________,
  accepted_at_exists: _________________,
  completed_at_exists: _________________
}

PUSH_NODE 输出次数：_________________

SKIP_NODE 输出次数：_________________

TIMELINE_BEFORE_SORT: {
  node_count: _________________,
  node_ids: [ ... ]
}

TIMELINE_AFTER_SORT: {
  node_count: _________________,
  node_ids: [ ... ],
  sorted_correctly: _________________
}

TIMELINE_OUTPUT: {
  total_nodes: _________________,
  nodes: [ ... ]
}

结论：
1. 是否因 if (!order.accepted_at) return 导致节点丢失？
   [ ] 是（有 SKIP_NODE 输出，但这是正常的，不是"吃掉事实"）
   [ ] 否（有 PUSH_NODE 输出）

2. 是否因时间排序被覆盖？
   [ ] 是（node_count 或 node_ids 不同）
   [ ] 否（node_count 和 node_ids 相同）

3. 是否 traces 为空导致 UI 看起来"没事实"？
   [ ] 是（traces_count = 0，total_nodes = 1）
   [ ] 否（traces_count > 0，total_nodes > 1）
```

---

**生成时间：** 2025-01-20  
**代码位置：** `components/facts/OrderTimeline.tsx` 第 73-185 行
