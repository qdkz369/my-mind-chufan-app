# Facts → UI ViewModel 适配层

## 定位

**Facts → UI ViewModel 薄适配层**：
- 将 Facts API 返回的事实数据转换为 UI 可用的 ViewModel
- 不引入业务判断
- 不进行数据库查询
- 仅做字段映射、格式化、语义转换

## 核心原则

### 1. 只做数据转换
- ✅ 字段映射：将 Facts 字段映射到 UI 字段
- ✅ 格式化：时间格式化、数字格式化、文本格式化
- ✅ 语义转换：将 Facts 代码转换为 UI 显示文本（如 `status` → `"已接单"`）

### 2. 不引入业务判断
- ❌ 不判断权限
- ❌ 不判断流程状态
- ❌ 不判断数据合法性
- ❌ 不进行条件分支（除非是格式化逻辑）

### 3. 不进行数据库查询
- ❌ 不查询数据库
- ❌ 不调用其他 API
- ❌ 不获取额外数据
- ✅ 只使用传入的 Facts 数据

### 4. 每个文件只服务一个 UI 场景
- 一个 ViewModel 文件对应一个 UI 组件或页面
- 保持职责单一，便于维护

## 文件组织

```
lib/facts-ui/
├── README.md                    # 本文件
├── order-timeline.viewmodel.ts  # 订单时间线 ViewModel
├── asset-card.viewmodel.ts      # 资产卡片 ViewModel
├── restaurant-overview.viewmodel.ts  # 餐厅总览 ViewModel
├── fuel-stats.viewmodel.ts      # 燃料统计 ViewModel
└── ...                          # 其他 UI 场景
```

## 使用示例

### 输入：Facts API 数据
```typescript
// Facts API 返回
const factData = {
  order: {
    order_id: "123",
    status: "accepted",
    created_at: "2024-01-01T00:00:00Z",
    accepted_at: "2024-01-01T01:00:00Z",
    completed_at: null,
  },
  traces: [...],
  fact_warnings_structured: [...],
  fact_health: { score: 85, summary: {...} }
}
```

### 输出：UI ViewModel
```typescript
// ViewModel 转换后
const viewModel = {
  orderId: "123",
  statusLabel: "已接单",  // 语义转换
  createdAt: "2024-01-01 00:00",  // 格式化
  acceptedAt: "2024-01-01 01:00",  // 格式化
  completedAt: null,  // 保持 null，不推断
  timeline: [...],  // 时间线数据（已格式化）
  warnings: [...],  // 警告数据（已格式化）
  healthScore: 85,  // 字段映射
}
```

## 实现规范

### 1. 函数命名
- 使用 `toViewModel` 或 `convertToViewModel` 作为函数名
- 例如：`convertOrderFactsToTimelineViewModel`

### 2. 类型定义
- 每个 ViewModel 文件应定义对应的 ViewModel 类型
- 例如：`OrderTimelineViewModel`, `AssetCardViewModel`

### 3. 错误处理
- 处理 null/undefined 情况
- 不推断缺失数据，保持原值（null/undefined）
- 格式化失败时返回默认值或原值

### 4. 纯函数
- ViewModel 转换函数应为纯函数
- 不产生副作用
- 相同输入产生相同输出

## 禁止事项

### ❌ 禁止业务判断
```typescript
// ❌ 错误：判断权限
if (factData.fact_health.score < 50) {
  return { canView: false }  // 这是业务判断
}

// ✅ 正确：只转换数据
return {
  healthScore: factData.fact_health.score,
  healthLabel: formatHealthScore(factData.fact_health.score),
}
```

### ❌ 禁止数据库查询
```typescript
// ❌ 错误：查询数据库
const user = await getUserById(factData.order.worker_id)

// ✅ 正确：只使用传入数据
return {
  workerId: factData.order.worker_id,
  workerName: null,  // 如果 Facts 中没有，保持 null
}
```

### ❌ 禁止流程控制
```typescript
// ❌ 错误：控制流程
if (factData.order.status === 'completed') {
  router.push('/completed')
}

// ✅ 正确：只转换数据
return {
  status: factData.order.status,
  statusLabel: statusLabelMap[factData.order.status] || factData.order.status,
}
```

## 与 UI 组件的集成

### 之前（直接使用 Facts）
```typescript
// ❌ UI 组件直接理解 Facts 语义
function OrderTimeline({ order, traces }: { order: OrderFactContract, traces: TraceFactContract[] }) {
  const statusLabel = statusLabelMap[order.status] || order.status  // UI 层做转换
  const formattedTime = formatTime(order.created_at)  // UI 层做格式化
  // ...
}
```

### 之后（通过 ViewModel）
```typescript
// ✅ UI 组件只理解 ViewModel
function OrderTimeline({ viewModel }: { viewModel: OrderTimelineViewModel }) {
  // viewModel 已经包含格式化后的数据
  return <div>{viewModel.statusLabel} - {viewModel.formattedCreatedAt}</div>
}

// ViewModel 转换在组件外部完成
const viewModel = convertOrderFactsToTimelineViewModel(order, traces)
<OrderTimeline viewModel={viewModel} />
```
