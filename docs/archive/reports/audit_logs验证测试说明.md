# audit_logs 验证测试说明

## ✅ 代码已更新

**文件：** `app/api/facts/orders/[order_id]/route.ts`

**添加位置：** 第 104-107 行（在 audit_logs 查询之后）

**添加内容：**
```typescript
// 调试日志：验证 audit_logs 中是否真实存在订单事实数据
console.log("ORDER_ID", order_id)
console.log("AUDIT_LOGS_RAW", JSON.stringify(auditLogsData, null, 2))
console.log("AUDIT_LOGS_ERROR", auditLogsError)
```

---

## 🧪 测试步骤

### 1. 确保开发服务器正在运行

```bash
npm run dev
```

开发服务器应该在 3000 端口运行。

---

### 2. 获取一个真实的订单 ID

可以通过以下方式获取订单 ID：

#### 方式 A：通过前端页面
1. 打开浏览器访问 `http://localhost:3000/user-bound`
2. 打开浏览器开发者工具（F12）
3. 查看 Network 面板
4. 找到 `/api/facts/restaurant/:restaurant_id/latest-order` 请求
5. 查看响应中的 `order_id`

#### 方式 B：直接查询数据库
```sql
SELECT id, status, created_at 
FROM delivery_orders 
WHERE status = 'completed' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### 3. 调用订单事实 API

使用以下方式调用 API：

#### 方式 A：使用浏览器直接访问
```
http://localhost:3000/api/facts/orders/{order_id}
```

**注意：** 需要在请求头中添加 `x-restaurant-id`，所以浏览器直接访问可能会失败。

#### 方式 B：使用 curl（推荐）
```bash
curl -X GET "http://localhost:3000/api/facts/orders/{order_id}" \
  -H "x-restaurant-id: {your_restaurant_id}"
```

**替换：**
- `{order_id}` - 步骤 2 中获取的订单 ID
- `{your_restaurant_id}` - 你的 restaurant_id（可以从 localStorage 获取）

#### 方式 C：使用浏览器开发者工具（Console）
```javascript
fetch('/api/facts/orders/{order_id}', {
  headers: {
    'x-restaurant-id': localStorage.getItem('restaurantId')
  }
})
.then(res => res.json())
.then(data => console.log(data))
```

---

### 4. 查看服务器控制台输出

在运行 `npm run dev` 的终端窗口中，你应该能看到类似以下的输出：

```
ORDER_ID 550e8400-e29b-41d4-a716-446655440000
AUDIT_LOGS_RAW [
  {
    "action": "ORDER_CREATED",
    "created_at": "2025-01-18T08:30:00.000Z",
    "actor_id": "111e2222-e33b-44c5-d566-778899001122"
  },
  {
    "action": "ORDER_ACCEPTED",
    "created_at": "2025-01-18T09:15:00.000Z",
    "actor_id": "987e6543-e21b-34c5-d678-912345678901"
  },
  {
    "action": "ORDER_COMPLETED",
    "created_at": "2025-01-18T14:35:00.000Z",
    "actor_id": "987e6543-e21b-34c5-d678-912345678901"
  }
]
AUDIT_LOGS_ERROR null
```

---

## 📊 预期输出格式

### 情况 1：有 audit_logs 记录

```
ORDER_ID 550e8400-e29b-41d4-a716-446655440000
AUDIT_LOGS_RAW [
  {
    "action": "ORDER_CREATED",
    "created_at": "2025-01-18T08:30:00.000Z",
    "actor_id": "111e2222-e33b-44c5-d566-778899001122"
  },
  {
    "action": "ORDER_ACCEPTED",
    "created_at": "2025-01-18T09:15:00.000Z",
    "actor_id": "987e6543-e21b-34c5-d678-912345678901"
  },
  {
    "action": "ORDER_COMPLETED",
    "created_at": "2025-01-18T14:35:00.000Z",
    "actor_id": "987e6543-e21b-34c5-d678-912345678901"
  }
]
AUDIT_LOGS_ERROR null
```

### 情况 2：无 audit_logs 记录

```
ORDER_ID 550e8400-e29b-41d4-a716-446655440000
AUDIT_LOGS_RAW []
AUDIT_LOGS_ERROR null
```

### 情况 3：查询失败

```
ORDER_ID 550e8400-e29b-41d4-a716-446655440000
AUDIT_LOGS_RAW null
AUDIT_LOGS_ERROR {
  "message": "错误信息",
  "code": "错误代码",
  ...
}
```

---

## ✅ 三点结论检查清单

根据控制台输出，回答以下三个问题：

### 1. audit_logs 是否有记录？

**检查：**
- 查看 `AUDIT_LOGS_RAW` 输出
- 如果是 `[]`（空数组）→ **没有记录**
- 如果是 `[{...}, {...}]`（有对象的数组）→ **有记录**
- 如果是 `null` 且 `AUDIT_LOGS_ERROR` 不为 null → **查询失败**

**预期：**
- ✅ **应该有记录**（至少应该有 ORDER_CREATED、ORDER_ACCEPTED、ORDER_COMPLETED 等）

**如果无记录，可能原因：**
- 数据库中没有对应的 audit_logs 记录
- `target_type` 或 `target_id` 不匹配
- 订单状态变化时没有写入 audit_logs

---

### 2. action 实际包含哪些值？

**检查：**
- 查看 `AUDIT_LOGS_RAW` 数组中每个对象的 `action` 字段
- 列出所有不同的 action 值

**预期 action 值（常见）：**
- `ORDER_CREATED` - 订单创建
- `ORDER_ACCEPTED` 或 `ORDER_ACCEPT` - 订单已接单
- `ORDER_DISPATCHED` - 订单已派送
- `ORDER_DELIVERING` - 订单配送中
- `ORDER_COMPLETED` 或 `ORDER_COMPLETE` - 订单已完成
- `ORDER_REJECTED` - 订单已拒绝
- `ORDER_CANCELLED` - 订单已取消

**注意：**
- 代码支持 `ORDER_ACCEPTED` 和 `ORDER_ACCEPT` 两种格式
- 代码支持 `ORDER_COMPLETED` 和 `ORDER_COMPLETE` 两种格式
- 其他 action 值可能存在于 audit_logs 中，但代码中只提取 accepted_at 和 completed_at

---

### 3. created_at 是否合理？

**检查：**
- 查看 `AUDIT_LOGS_RAW` 数组中每个对象的 `created_at` 字段
- 检查时间顺序是否合理（应该按时间递增）
- 检查时间格式是否正确（应该是 ISO 8601 格式，如 `2025-01-18T08:30:00.000Z`）

**合理性检查：**
- ✅ **时间顺序：** ORDER_CREATED < ORDER_ACCEPTED < ORDER_COMPLETED
- ✅ **时间格式：** 应该是 ISO 8601 格式（YYYY-MM-DDTHH:mm:ss.sssZ）
- ✅ **时间范围：** 应该在合理的业务时间范围内（不是未来时间，不是过远的历史）

**示例合理时间线：**
```
ORDER_CREATED:     2025-01-18T08:30:00.000Z
ORDER_ACCEPTED:    2025-01-18T09:15:00.000Z  (45分钟后)
ORDER_COMPLETED:   2025-01-18T14:35:00.000Z  (5小时20分钟后)
```

---

## 📝 测试结果记录模板

```
订单 ID: _________________

1. audit_logs 是否有记录？
   [ ] 是（有记录）
   [ ] 否（空数组）
   [ ] 查询失败

2. action 实际包含哪些值？
   - _________________
   - _________________
   - _________________

3. created_at 是否合理？
   - 时间顺序：_________________
   - 时间格式：_________________
   - 时间范围：_________________
```

---

## 🔍 如果发现问题

### 问题 1：没有 audit_logs 记录

**可能原因：**
- 订单状态变化时没有写入 audit_logs
- 需要检查订单状态变更的代码是否写入了 audit_logs

**建议：**
- 检查订单接单、完成等操作的代码
- 确认是否调用了 audit_logs 的插入逻辑

---

### 问题 2：action 值不符合预期

**可能原因：**
- action 的命名不一致
- 需要检查代码中的 action 命名规范

**建议：**
- 统一 action 命名规范
- 更新代码以支持实际使用的 action 值

---

### 问题 3：created_at 不合理

**可能原因：**
- 数据库时间戳不正确
- 时区问题

**建议：**
- 检查数据库时间设置
- 确认时区配置

---

**生成时间：** 2025-01-20  
**代码位置：** `app/api/facts/orders/[order_id]/route.ts` 第 104-107 行
