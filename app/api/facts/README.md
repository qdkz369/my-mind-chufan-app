# Facts API 铁律

## 三条铁律

### 1. Facts API 永远只读

**铁律**：Facts API 永远只读，不执行任何数据库写操作。

**含义**：
- ✅ 只执行 `SELECT` 查询
- ✅ 只聚合和转换数据
- ✅ 只返回事实视图
- ❌ 不执行 `INSERT`、`UPDATE`、`DELETE`
- ❌ 不修改任何业务状态
- ❌ 不触发任何业务动作

**验证方法**：
- 代码审查：搜索 `update(`, `insert(`, `delete(`, `.upsert(`, `.remove(` 等关键词
- 运行时检查：所有 Facts API 路由必须通过只读验证

**违反后果**：
- 破坏事实系统的"只读真理表面"原则
- 导致事实与业务状态混淆
- 使事实系统失去可信度

---

### 2. Facts API 不为 UI 服务，只为"事实视图"

**铁律**：Facts API 不为 UI 服务，只为"事实视图"。

**含义**：
- ✅ Facts API 返回的是"事实视图"（Fact View），不是"UI 视图"（UI View）
- ✅ 事实视图是结构化的、机器可读的、可被质疑的数据
- ✅ 事实视图包含：`facts`、`fact_warnings_structured`、`fact_health`
- ❌ 不为特定 UI 组件定制返回格式
- ❌ 不包含 UI 渲染所需的格式化数据（如颜色、图标、文案）
- ❌ 不包含 UI 交互逻辑（如按钮状态、权限判断）

**设计原则**：
- **分离关注点**：UI 层负责将"事实视图"转换为"UI 视图"
- **可复用性**：同一事实视图可以被多个 UI 组件使用
- **可测试性**：事实视图不依赖 UI 框架，可独立测试

**示例**：
```typescript
// ✅ 正确：返回事实视图
{
  "order": { "order_id": "...", "status": "completed" },
  "fact_warnings_structured": [...],
  "fact_health": { "score": 85 }
}

// ❌ 错误：为 UI 定制
{
  "order": { "order_id": "...", "status": "completed" },
  "ui": {
    "statusColor": "green",
    "statusIcon": "check",
    "canEdit": false
  }
}
```

**违反后果**：
- 事实视图与 UI 视图耦合
- 无法被非 UI 系统（如策略系统、AI 系统）复用
- 增加维护成本，UI 变更需要修改 Facts API

---

### 3. Facts API 返回的是"可被质疑的事实"，不是"业务真相"

**铁律**：Facts API 返回的是"可被质疑的事实"，不是"业务真相"。

**含义**：
- ✅ Facts API 返回的是"可被质疑的事实"（Questionable Facts）
- ✅ 事实可能包含异常、不一致、时间逻辑错误
- ✅ 通过 `fact_warnings_structured` 和 `fact_health` 暴露数据质量问题
- ❌ 不返回"业务真相"（Business Truth），即不保证数据完全正确
- ❌ 不修复数据异常，只暴露异常
- ❌ 不推断或猜测缺失数据，只返回实际存在的数据

**设计原则**：
- **透明性**：所有数据质量问题必须通过 `fact_warnings_structured` 暴露
- **可质疑性**：调用方可以质疑返回的事实，通过 `evidence` 字段验证
- **不修复原则**：Facts API 不修复数据，只暴露问题

**示例**：
```typescript
// ✅ 正确：返回可被质疑的事实
{
  "order": {
    "order_id": "123",
    "completed_at": "2024-01-01T00:00:00Z",  // 可能异常
    "created_at": "2024-01-02T00:00:00Z"      // 时间逻辑错误
  },
  "fact_warnings_structured": [
    {
      "code": "FACT_TIME_INVERSION",
      "level": "high",
      "message": "completed_at 早于 created_at",
      "evidence": { ... }
    }
  ],
  "fact_health": { "score": 70 }
}

// ❌ 错误：返回"业务真相"（推断或修复）
{
  "order": {
    "order_id": "123",
    "completed_at": "2024-01-02T00:00:00Z",  // 被"修复"了
    "created_at": "2024-01-02T00:00:00Z"
  },
  "fact_warnings_structured": []  // 异常被隐藏
}
```

**违反后果**：
- 掩盖数据质量问题
- 使调用方无法发现和修复数据异常
- 破坏事实系统的"透明性"原则

---

## 铁律的优先级

**优先级**：三条铁律同等重要，违反任何一条都会破坏 Facts API 的核心价值。

**执行顺序**：
1. 首先确保"只读"（铁律 1）
2. 然后确保"事实视图"（铁律 2）
3. 最后确保"可被质疑"（铁律 3）

---

## 如何验证铁律

### 代码审查清单

- [ ] 搜索 `update(`, `insert(`, `delete(` 等关键词，确认无数据库写操作
- [ ] 检查返回结构，确认不包含 UI 特定字段（如 `statusColor`、`canEdit`）
- [ ] 检查是否所有异常都通过 `fact_warnings_structured` 暴露
- [ ] 检查是否包含 `fact_health` 字段，用于量化数据质量

### 运行时验证

- [ ] 所有 Facts API 路由必须通过只读验证脚本
- [ ] 所有 Facts API 返回必须包含 `fact_warnings_structured`（即使为空数组）
- [ ] 所有 Facts API 返回必须包含 `fact_health`（即使为 100 分）

---

## 相关文档

- [Facts 系统 README](../../../lib/facts/README.md)
- [Facts 消费者说明](../../../docs/facts-consumers.md)
- [Facts 消费者使用说明](../../../docs/facts-consumers-usage.md)
- [Facts 观察层分析](../../../docs/facts-observation-layer-analysis.md)
