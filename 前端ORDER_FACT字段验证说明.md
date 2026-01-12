# 前端 ORDER_FACT 字段验证说明

## ✅ 代码已更新

**文件：** `app/user-bound/page.tsx`

**添加位置：** 第 141-153 行（在 `setLatestOrder` 之前）

**添加内容：**
1. 输出完整的 orderFactData.order 对象（第 142 行）
2. 输出字段存在性和类型检查（第 143-153 行）

---

## 📊 预期输出格式

### 1. ORDER_FACT_FROM_API（完整的 order 对象）

在浏览器控制台（Console）中查看，应该能看到类似以下的输出：

```
ORDER_FACT_FROM_API {
  order_id: "550e8400-e29b-41d4-a716-446655440000",
  restaurant_id: "123e4567-e89b-12d3-a456-426614174000",
  status: "completed",
  created_at: "2025-01-18T08:30:00.000Z",
  worker_id: "987e6543-e21b-34c5-d678-912345678901",
  accepted_at: "2025-01-18T09:15:00.000Z",
  completed_at: "2025-01-18T14:35:00.000Z"
}
```

---

### 2. ORDER_FACT_FIELDS_CHECK（字段存在性和类型检查）

#### 情况 1：两个字段都存在

```
ORDER_FACT_FIELDS_CHECK {
  accepted_at_exists: true,
  completed_at_exists: true,
  accepted_at_value: "2025-01-18T09:15:00.000Z",
  completed_at_value: "2025-01-18T14:35:00.000Z",
  accepted_at_type: "string",
  completed_at_type: "string",
  order_keys: [
    "order_id",
    "restaurant_id",
    "status",
    "created_at",
    "worker_id",
    "accepted_at",
    "completed_at"
  ]
}
```

---

#### 情况 2：accepted_at 不存在（undefined）

```
ORDER_FACT_FIELDS_CHECK {
  accepted_at_exists: false,
  completed_at_exists: true,
  accepted_at_value: null,
  completed_at_value: "2025-01-18T14:35:00.000Z",
  accepted_at_type: "undefined",
  completed_at_type: "string",
  order_keys: [
    "order_id",
    "restaurant_id",
    "status",
    "created_at",
    "worker_id",
    "completed_at"
  ]
}
```

**注意：** `accepted_at` 不在 `order_keys` 中，因为它是 `undefined`。

---

#### 情况 3：completed_at 不存在（undefined）

```
ORDER_FACT_FIELDS_CHECK {
  accepted_at_exists: true,
  completed_at_exists: false,
  accepted_at_value: "2025-01-18T09:15:00.000Z",
  completed_at_value: null,
  completed_at_type: "string",
  completed_at_type: "undefined",
  order_keys: [
    "order_id",
    "restaurant_id",
    "status",
    "created_at",
    "worker_id",
    "accepted_at"
  ]
}
```

**注意：** `completed_at` 不在 `order_keys` 中，因为它是 `undefined`。

---

#### 情况 4：两个字段都不存在（undefined）

```
ORDER_FACT_FIELDS_CHECK {
  accepted_at_exists: false,
  completed_at_exists: false,
  accepted_at_value: null,
  completed_at_value: null,
  accepted_at_type: "undefined",
  completed_at_type: "undefined",
  order_keys: [
    "order_id",
    "restaurant_id",
    "status",
    "created_at",
    "worker_id"
  ]
}
```

**注意：** `accepted_at` 和 `completed_at` 都不在 `order_keys` 中，因为它们都是 `undefined`。

---

## ✅ 验证检查清单

根据浏览器控制台输出，检查以下内容：

### 1. accepted_at 是否存在？

**检查：**
- 查看 `ORDER_FACT_FIELDS_CHECK.accepted_at_exists`
- 查看 `ORDER_FACT_FIELDS_CHECK.accepted_at_value`
- 查看 `ORDER_FACT_FIELDS_CHECK.order_keys` 是否包含 `"accepted_at"`

**预期：**
- ✅ **如果存在**：`accepted_at_exists` 为 `true`，`accepted_at_value` 为时间戳字符串，`accepted_at_type` 为 `"string"`，`order_keys` 包含 `"accepted_at"`
- ❌ **如果不存在**：`accepted_at_exists` 为 `false`，`accepted_at_value` 为 `null`，`accepted_at_type` 为 `"undefined"`，`order_keys` 不包含 `"accepted_at"`

**可能原因（如果不存在）：**
- API 返回的 `orderFact.accepted_at` 为 `undefined`（audit_logs 中没有 ORDER_ACCEPTED 记录）
- JSON 序列化时丢失（不应该发生，因为 `undefined` 会被 JSON.stringify 忽略）

---

### 2. completed_at 是否存在？

**检查：**
- 查看 `ORDER_FACT_FIELDS_CHECK.completed_at_exists`
- 查看 `ORDER_FACT_FIELDS_CHECK.completed_at_value`
- 查看 `ORDER_FACT_FIELDS_CHECK.order_keys` 是否包含 `"completed_at"`

**预期：**
- ✅ **如果存在**：`completed_at_exists` 为 `true`，`completed_at_value` 为时间戳字符串，`completed_at_type` 为 `"string"`，`order_keys` 包含 `"completed_at"`
- ❌ **如果不存在**：`completed_at_exists` 为 `false`，`completed_at_value` 为 `null`，`completed_at_type` 为 `"undefined"`，`order_keys` 不包含 `"completed_at"`

**可能原因（如果不存在）：**
- API 返回的 `orderFact.completed_at` 为 `undefined`（audit_logs 中没有 ORDER_COMPLETED 记录）
- JSON 序列化时丢失（不应该发生，因为 `undefined` 会被 JSON.stringify 忽略）

---

### 3. 是否被 JSON 序列化丢失？

**检查：**
- 对比服务器控制台的 `ORDER_FACT_RETURN` 输出（指令 3）
- 对比浏览器控制台的 `ORDER_FACT_FROM_API` 输出

**验证方法：**
1. **服务器端（指令 3）：** 查看 `ORDER_FACT_RETURN` 输出
   - 如果 `accepted_at` 在服务器端存在（非 undefined），但在浏览器端不存在 → **JSON 序列化丢失**
   - 如果 `completed_at` 在服务器端存在（非 undefined），但在浏览器端不存在 → **JSON 序列化丢失**

2. **浏览器端（指令 4）：** 查看 `ORDER_FACT_FROM_API` 输出
   - 如果 `accepted_at` 在 `ORDER_FACT_FROM_API` 中不存在，但 `accepted_at_type` 为 `"undefined"` → **API 返回时就是 undefined**（不是 JSON 序列化丢失）
   - 如果 `accepted_at` 在 `ORDER_FACT_FROM_API` 中不存在，且 `order_keys` 中也没有 → **API 返回时就是 undefined**（不是 JSON 序列化丢失）

**注意：**
- JSON 序列化不会丢失 `undefined` 字段，而是**完全忽略**它们（字段不会被包含在 JSON 字符串中）
- 如果服务器端 `orderFact.accepted_at` 为 `undefined`，API 返回的 JSON 中**不会包含** `accepted_at` 字段
- 浏览器端 `orderFactData.order.accepted_at` 也会是 `undefined`

---

## 🔍 JSON 序列化行为说明

### JSON.stringify 的行为

JavaScript 的 `JSON.stringify()` 函数会：
- ✅ **保留** `null` 值（序列化为 `null`）
- ❌ **忽略** `undefined` 值（不包含在 JSON 字符串中）

**示例：**
```javascript
const obj = {
  a: "value",
  b: null,
  c: undefined
}

JSON.stringify(obj)
// 结果：'{"a":"value","b":null}'
// 注意：c 字段被完全忽略，不包含在 JSON 字符串中
```

### NextResponse.json 的行为

Next.js 的 `NextResponse.json()` 内部使用 `JSON.stringify()`，所以行为相同：
- ✅ **保留** `null` 值
- ❌ **忽略** `undefined` 值

### 前端接收行为

浏览器端的 `response.json()` 会：
- ✅ **保留** `null` 值（反序列化为 `null`）
- ❌ **忽略**不存在的字段（反序列化后为 `undefined`）

**示例：**
```javascript
// API 返回：{"a":"value","b":null}
// 前端接收：
{
  a: "value",
  b: null,
  c: undefined  // 字段不存在，所以是 undefined
}
```

---

## ✅ 验证结果记录模板

```
订单 ID: _________________

浏览器控制台输出：

ORDER_FACT_FROM_API: {
  order_id: _________________,
  restaurant_id: _________________,
  status: _________________,
  created_at: _________________,
  worker_id: _________________,
  accepted_at: _________________,
  completed_at: _________________
}

ORDER_FACT_FIELDS_CHECK: {
  accepted_at_exists: _________________,
  completed_at_exists: _________________,
  accepted_at_value: _________________,
  completed_at_value: _________________,
  accepted_at_type: _________________,
  completed_at_type: _________________,
  order_keys: [
    _________________,
    _________________,
    _________________
  ]
}

结论：
1. accepted_at 是否存在？
   [ ] 是（存在）
   [ ] 否（不存在，原因：_________________）

2. completed_at 是否存在？
   [ ] 是（存在）
   [ ] 否（不存在，原因：_________________）

3. 是否被 JSON 序列化丢失？
   [ ] 是（服务器端存在，浏览器端不存在）
   [ ] 否（服务器端和浏览器端一致）
   
   服务器端值：_________________
   浏览器端值：_________________
```

---

## 🔍 如果发现问题

### 问题 1：accepted_at 或 completed_at 不存在

**可能原因：**
1. **API 返回时就是 undefined**（audit_logs 中没有对应记录）
   - 这是**正常的**，如果 audit_logs 中没有 ORDER_ACCEPTED/ORDER_COMPLETED 记录
   - 检查指令 1 的 `AUDIT_LOGS_RAW` 输出
   - 检查指令 2 的 `FACT_TIMES` 输出
   - 检查指令 3 的 `ORDER_FACT_RETURN` 输出

2. **JSON 序列化丢失**（理论上不应该发生）
   - 如果服务器端的 `ORDER_FACT_RETURN` 中有值（非 undefined），但浏览器端没有 → **JSON 序列化丢失**
   - 这种情况**不应该发生**，因为 JSON.stringify 不会丢失 `null` 值，只会忽略 `undefined` 值

**建议：**
- 对比服务器端和浏览器端的输出
- 如果服务器端有值，浏览器端没有 → 检查 API 返回的 JSON 字符串（Network 面板）
- 如果服务器端就是 undefined → 检查 audit_logs 中是否有对应记录

---

### 问题 2：字段类型不正确

**检查：**
- `accepted_at_type` 和 `completed_at_type` 应该为 `"string"`（如果存在）
- 如果类型不是 `"string"`，说明数据格式有问题

**建议：**
- 检查 API 返回的数据格式
- 检查数据库中的时间戳格式

---

**生成时间：** 2025-01-20  
**代码位置：** `app/user-bound/page.tsx` 第 141-153 行
