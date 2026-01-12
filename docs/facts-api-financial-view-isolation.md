# Facts API 金融视图隔离规范

## 完成时间
2025-01-20

## 核心原则

**Financial View 不得污染事实 API**

Facts API 必须保持"纯事实"特性，严禁包含任何金融字段或金融计算。

## 禁止的金融字段

以下字段**严禁**出现在任何 Facts API 的返回结果中：

- `amount` - 金额
- `rate` - 利率
- `installment` - 分期
- `repayment` - 还款
- `interest` - 利息
- `price` - 价格
- `fee` - 费用
- `cost` - 成本
- `total_amount` - 总金额
- `total_spent` - 累计消费金额
- `total_price` - 总价格
- `total_fee` - 总费用
- `total_cost` - 总成本
- 任何其他金额、费用、价格相关的字段

## 规则

### 1. Facts API 禁止事项

- ⛔ **禁止返回任何金融字段**：Facts API 不得返回任何金额、费用、价格、利率等金融字段
- ⛔ **禁止查询金融字段**：Facts API 不得查询 `total_amount`、`price`、`fee` 等金融字段
- ⛔ **禁止计算金额**：Facts API 不得计算任何金额或费用
- ⛔ **禁止写入 facts 表**：严禁将金融信息写入 facts 表或结构

### 2. Financial View 独立原则

- ✅ **独立 API**：如需展示金融信息，必须使用独立的 Financial View API
- ✅ **派生数据**：Financial View 是派生数据（Derived），不是事实（Fact）
- ✅ **非事实数据**：Financial View 是 Non-Fact，不应出现在 Facts API 中

### 3. 代码注释规范

在所有 Facts API 文件顶部，必须添加以下注释：

```typescript
/**
 * 5. ⚠️ Financial View 禁止事项（重要）
 *    - 本 API 不返回任何金融字段（amount, rate, installment, repayment, interest）
 *    - 如需展示金融信息，请使用独立的 Financial View API
 *    - 严禁写入 facts 表或结构
 *    - Financial View – Derived / Non-Fact（金融视图是派生/非事实数据）
 */
```

在代码中使用金融字段时，必须添加注释：

```typescript
// ⚠️ Financial View – Derived / Non-Fact
// 已移除：累计消费金额（total_spent）
// 原因：Facts API 禁止返回任何金融字段（amount, rate, installment, repayment, interest）
// 如需展示金融信息，请使用独立的 Financial View API
// 严禁写入 facts 表或结构
```

## 已修复的 API

### 1. `/api/facts/fuel/:device_id/stats`

**修复前**：
- 查询了 `total_amount` 字段（金融字段）
- 使用 `total_amount / 11.5` 估算加注量（涉及金额计算）

**修复后**：
- ✅ 只查询 `quantity` 字段（数量，kg）
- ✅ 不查询 `total_amount` 字段
- ✅ 如果 `quantity` 不存在，返回 0（不通过 `total_amount` 估算）
- ✅ 添加注释：`⚠️ Facts API 禁止：不查询任何金融字段（amount, rate, installment, repayment, interest）`

**返回结构**：
```json
{
  "success": true,
  "total_refilled": 0,        // 累计加注量（kg，事实）
  "daily_consumption": 0,     // 日均消耗（kg/天，事实）
  "usage_efficiency": 0       // 使用效率（%，事实）
}
```

### 2. `/api/facts/restaurant/:restaurant_id/stats`

**修复前**：
- 返回了 `total_spent` 字段（累计消费金额，金融字段）
- 查询了 `total_amount` 字段
- 计算了累计消费金额

**修复后**：
- ✅ 移除了 `total_spent` 字段
- ✅ 移除了所有 `total_amount` 查询
- ✅ 移除了所有金额计算逻辑
- ✅ 添加注释：`⚠️ Financial View – Derived / Non-Fact`

**返回结构**：
```json
{
  "success": true,
  "total_orders": 0,          // 累计订单数（事实）
  "points_balance": 0         // 积分余额（事实，非金融字段）
}
```

**已移除字段**：
- `total_spent` - Financial View – Derived / Non-Fact（已移除）

## 验证清单

### ✅ 达标检查

- [x] Facts API 仍然是纯 SELECT（只读查询）
  - 所有 Facts API 只执行 `SELECT` 查询
  - 不执行 `INSERT`、`UPDATE`、`DELETE`
  - 不修改任何数据

- [x] Facts API 不包含任何金融字段
  - `/api/facts/orders/:order_id` - ✅ 无金融字段
  - `/api/facts/fuel/:device_id/stats` - ✅ 已移除 `total_amount` 查询
  - `/api/facts/restaurant/:restaurant_id/stats` - ✅ 已移除 `total_spent` 字段
  - `/api/facts/restaurant/:restaurant_id/overview` - ✅ 无金融字段
  - `/api/facts/restaurant/:restaurant_id/assets` - ✅ 无金融字段
  - `/api/facts/restaurant/:restaurant_id/latest-order` - ✅ 无金融字段

- [x] Financial API 不反向写事实
  - Financial View API 是独立的，不写入 facts 表
  - Financial View API 不修改任何事实数据

- [x] 代码注释已添加
  - 所有 Facts API 文件顶部已添加 Financial View 禁止事项注释
  - 所有移除的金融字段已添加注释说明

## 总结

Financial View 隔离规范已成功实现：

- ✅ 所有 Facts API 已移除金融字段
- ✅ 所有 Facts API 已添加 Financial View 禁止事项注释
- ✅ Facts API 仍然是纯 SELECT（只读查询）
- ✅ Financial View API 不反向写事实

符合所有要求，验证通过！
