# accepted_at / completed_at 验证说明

## ✅ 代码已更新

**文件：** `app/api/facts/orders/[order_id]/route.ts`

**添加位置：** 第 109-170 行（在 audit_logs 查询之后，计算 accepted_at 和 completed_at 之后）

**添加内容：**
1. 收集所有 action 值（第 112、119-121 行）
2. 判断字段为 null 的原因（第 136-155 行）
3. 输出调试日志（第 166-173 行）

---

## 🔍 代码逻辑说明

### 1. 收集所有 action 值

在遍历 audit_logs 记录时，收集所有的 action 值用于后续分析：

```typescript
const allActionValues: string[] = []
auditLogsData.forEach((log) => {
  if (log.action) {
    allActionValues.push(log.action)
  }
  // ... 计算 acceptedAt 和 completedAt
})
```

---

### 2. 判断字段为 null 的原因

在遍历完成后，判断为什么某个字段为 null：

#### accepted_at 为 null 的原因

```typescript
if (!acceptedAt) {
  const hasAcceptAction = allActionValues.some(action => {
    const upper = action?.toUpperCase() || ""
    return upper === "ORDER_ACCEPTED" || upper === "ORDER_ACCEPT"
  })
  acceptedAtReason = hasAcceptAction 
    ? "action 名称不匹配（期望 ORDER_ACCEPTED 或 ORDER_ACCEPT）" 
    : "audit_logs 无该 action（ORDER_ACCEPTED / ORDER_ACCEPT）"
}
```

**判断逻辑：**
- 如果 `allActionValues` 中有匹配的 action（ORDER_ACCEPTED 或 ORDER_ACCEPT），但 `acceptedAt` 仍为 null → **action 名称不匹配**
- 如果 `allActionValues` 中没有匹配的 action → **audit_logs 无该 action**

#### completed_at 为 null 的原因

```typescript
if (!completedAt) {
  const hasCompleteAction = allActionValues.some(action => {
    const upper = action?.toUpperCase() || ""
    return upper === "ORDER_COMPLETED" || upper === "ORDER_COMPLETE"
  })
  completedAtReason = hasCompleteAction 
    ? "action 名称不匹配（期望 ORDER_COMPLETED 或 ORDER_COMPLETE）" 
    : "audit_logs 无该 action（ORDER_COMPLETED / ORDER_COMPLETE）"
}
```

**判断逻辑：**
- 如果 `allActionValues` 中有匹配的 action（ORDER_COMPLETED 或 ORDER_COMPLETE），但 `completedAt` 仍为 null → **action 名称不匹配**
- 如果 `allActionValues` 中没有匹配的 action → **audit_logs 无该 action**

---

### 3. 输出调试日志

在计算完成后，输出完整的调试信息：

```typescript
console.log("FACT_TIMES", {
  accepted_at: acceptedAt || null,
  completed_at: completedAt || null,
  accepted_at_reason: acceptedAtReason || "已找到",
  completed_at_reason: completedAtReason || "已找到",
  all_actions: allActionValues,
})
```

---

## 📊 预期输出格式

### 情况 1：两个字段都成功计算

```
FACT_TIMES {
  accepted_at: "2025-01-18T09:15:00.000Z",
  completed_at: "2025-01-18T14:35:00.000Z",
  accepted_at_reason: "已找到",
  completed_at_reason: "已找到",
  all_actions: [
    "ORDER_CREATED",
    "ORDER_ACCEPTED",
    "ORDER_DISPATCHED",
    "ORDER_COMPLETED"
  ]
}
```

---

### 情况 2：accepted_at 为 null（audit_logs 无该 action）

```
FACT_TIMES {
  accepted_at: null,
  completed_at: "2025-01-18T14:35:00.000Z",
  accepted_at_reason: "audit_logs 无该 action（ORDER_ACCEPTED / ORDER_ACCEPT）",
  completed_at_reason: "已找到",
  all_actions: [
    "ORDER_CREATED",
    "ORDER_DISPATCHED",
    "ORDER_COMPLETED"
  ]
}
```

**说明：** `all_actions` 中没有 `ORDER_ACCEPTED` 或 `ORDER_ACCEPT`，所以标记为"无该 action"。

---

### 情况 3：accepted_at 为 null（action 名称不匹配）

```
FACT_TIMES {
  accepted_at: null,
  completed_at: "2025-01-18T14:35:00.000Z",
  accepted_at_reason: "action 名称不匹配（期望 ORDER_ACCEPTED 或 ORDER_ACCEPT）",
  completed_at_reason: "已找到",
  all_actions: [
    "ORDER_CREATED",
    "ORDER_ACCEPT",  // 注意：虽然代码支持 ORDER_ACCEPT，但这里假设有其他不匹配的情况
    "ORDER_DISPATCHED",
    "ORDER_COMPLETED"
  ]
}
```

**说明：** `all_actions` 中有类似的 action，但代码没有匹配到（理论上不会发生，因为代码已经支持 ORDER_ACCEPT）。

---

### 情况 4：completed_at 为 null（audit_logs 无该 action）

```
FACT_TIMES {
  accepted_at: "2025-01-18T09:15:00.000Z",
  completed_at: null,
  accepted_at_reason: "已找到",
  completed_at_reason: "audit_logs 无该 action（ORDER_COMPLETED / ORDER_COMPLETE）",
  all_actions: [
    "ORDER_CREATED",
    "ORDER_ACCEPTED",
    "ORDER_DISPATCHED"
  ]
}
```

**说明：** `all_actions` 中没有 `ORDER_COMPLETED` 或 `ORDER_COMPLETE`，所以标记为"无该 action"。

---

### 情况 5：两个字段都为 null（audit_logs 查询失败）

```
FACT_TIMES {
  accepted_at: null,
  completed_at: null,
  accepted_at_reason: "audit_logs 查询失败",
  completed_at_reason: "audit_logs 查询失败",
  all_actions: []
}
```

---

### 情况 6：两个字段都为 null（audit_logs 无记录）

```
FACT_TIMES {
  accepted_at: null,
  completed_at: null,
  accepted_at_reason: "audit_logs 无记录",
  completed_at_reason: "audit_logs 无记录",
  all_actions: []
}
```

---

## ✅ 验证检查清单

根据控制台输出，检查以下内容：

### 1. accepted_at 是否被正确计算？

**检查：**
- 查看 `accepted_at` 字段
- 如果为 `null`，查看 `accepted_at_reason` 了解原因

**可能的原因：**
- ✅ **已找到** - 成功从 audit_logs 提取
- ❌ **audit_logs 无该 action** - audit_logs 中没有 ORDER_ACCEPTED 或 ORDER_ACCEPT 记录
- ❌ **action 名称不匹配** - audit_logs 中有类似的 action，但名称不完全匹配
- ❌ **audit_logs 查询失败** - 查询 audit_logs 时出错
- ❌ **audit_logs 无记录** - audit_logs 为空或不存在

---

### 2. completed_at 是否被正确计算？

**检查：**
- 查看 `completed_at` 字段
- 如果为 `null`，查看 `completed_at_reason` 了解原因

**可能的原因：**
- ✅ **已找到** - 成功从 audit_logs 提取
- ❌ **audit_logs 无该 action** - audit_logs 中没有 ORDER_COMPLETED 或 ORDER_COMPLETE 记录
- ❌ **action 名称不匹配** - audit_logs 中有类似的 action，但名称不完全匹配
- ❌ **audit_logs 查询失败** - 查询 audit_logs 时出错
- ❌ **audit_logs 无记录** - audit_logs 为空或不存在

---

### 3. all_actions 包含哪些值？

**检查：**
- 查看 `all_actions` 数组
- 列出所有实际的 action 值

**预期值：**
- `ORDER_CREATED` - 订单创建
- `ORDER_ACCEPTED` 或 `ORDER_ACCEPT` - 订单已接单
- `ORDER_DISPATCHED` - 订单已派送
- `ORDER_DELIVERING` - 订单配送中
- `ORDER_COMPLETED` 或 `ORDER_COMPLETE` - 订单已完成

---

## 🔍 如果发现问题

### 问题 1：accepted_at 为 null（audit_logs 无该 action）

**可能原因：**
- 订单接单时没有写入 audit_logs
- 需要检查订单接单的代码逻辑

**建议：**
- 检查订单接单 API（如 `/api/orders/accept`）
- 确认是否在接单时写入了 audit_logs
- 确认写入的 action 名称是否为 `ORDER_ACCEPTED` 或 `ORDER_ACCEPT`

---

### 问题 2：completed_at 为 null（audit_logs 无该 action）

**可能原因：**
- 订单完成时没有写入 audit_logs
- 需要检查订单完成的代码逻辑

**建议：**
- 检查订单完成 API（如 `/api/orders/complete`）
- 确认是否在完成时写入了 audit_logs
- 确认写入的 action 名称是否为 `ORDER_COMPLETED` 或 `ORDER_COMPLETE`

---

### 问题 3：action 名称不匹配

**可能原因：**
- audit_logs 中的 action 名称与代码期望的不一致
- 需要检查写入 audit_logs 时的 action 命名

**建议：**
- 查看 `all_actions` 中的实际 action 值
- 检查代码中期望的 action 名称
- 统一 action 命名规范

---

## 📝 测试结果记录模板

```
订单 ID: _________________

FACT_TIMES 输出：
{
  accepted_at: _________________,
  completed_at: _________________,
  accepted_at_reason: _________________,
  completed_at_reason: _________________,
  all_actions: [
    _________________,
    _________________,
    _________________
  ]
}

结论：
1. accepted_at 是否被正确计算？
   [ ] 是（已找到）
   [ ] 否（原因：_________________）

2. completed_at 是否被正确计算？
   [ ] 是（已找到）
   [ ] 否（原因：_________________）

3. 如果字段为 null，原因是什么？
   accepted_at: _________________
   completed_at: _________________
```

---

**生成时间：** 2025-01-20  
**代码位置：** `app/api/facts/orders/[order_id]/route.ts` 第 109-173 行
