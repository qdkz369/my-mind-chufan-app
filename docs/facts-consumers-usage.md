# Facts API 消费方使用说明

## Facts API 定位

**Facts API 是事实观察层（Observation Layer）**：
- 只读事实表面（Read-Only Truth Surface）
- 不执行业务逻辑，不修改数据
- 仅提供可被质疑的事实数据

## UI 消费约束

### UI 必须通过 ViewModel 层消费 Facts

**架构要求**：
```
UI 组件
  ↓
ViewModel 层（转换 Facts → UI View）
  ↓
Facts API（事实观察层）
```

**ViewModel 层职责**：
- 将 Facts 数据转换为 UI 可用的格式
- 处理 UI 特定的格式化（如时间显示、状态标签）
- 不进行业务判断，只做数据转换

**UI 组件职责**：
- 接收 ViewModel 转换后的数据
- 仅负责渲染和用户交互
- 不直接调用 Facts API

### UI 禁止的三类行为

#### 1. 权限判断 ❌

**禁止行为**：
- ❌ 根据 `fact_health.score` 判断用户是否有权限查看订单
- ❌ 根据 `fact_warnings_structured` 判断用户是否有权限操作订单
- ❌ 根据 `order.status` 判断用户是否有权限执行某个操作

**正确做法**：
- ✅ 权限判断应在业务 API 层或中间件层完成
- ✅ UI 只负责展示 ViewModel 提供的数据
- ✅ 权限控制通过路由守卫或 API 权限验证实现

**示例（错误）**：
```typescript
// ❌ 错误：UI 基于 Facts 进行权限判断
if (factData.fact_health.score < 50) {
  return <div>您无权查看此订单</div>
}
```

**示例（正确）**：
```typescript
// ✅ 正确：权限在 API 层验证，UI 只展示数据
const viewModel = convertFactsToViewModel(factData)
return <OrderView data={viewModel} />
```

---

#### 2. 流程控制 ❌

**禁止行为**：
- ❌ 根据 `fact_health.score` 决定是否显示"修复数据"按钮
- ❌ 根据 `fact_warnings_structured` 决定是否自动跳转到错误页面
- ❌ 根据 `order.status` 决定是否自动触发订单状态变更
- ❌ 根据 `fact_warnings_structured[].level === 'high'` 决定是否阻止用户操作

**正确做法**：
- ✅ 流程控制应在业务逻辑层完成
- ✅ UI 只负责展示状态，不控制流程
- ✅ 用户操作应调用业务 API，而不是基于 Facts 判断

**示例（错误）**：
```typescript
// ❌ 错误：UI 基于 Facts 控制流程
if (factData.fact_health.score < 30) {
  router.push('/error-page')
  return null
}
```

**示例（正确）**：
```typescript
// ✅ 正确：UI 只展示数据，流程由业务逻辑控制
const viewModel = convertFactsToViewModel(factData)
return (
  <div>
    <OrderInfo data={viewModel.order} />
    {viewModel.showWarning && <WarningBanner warnings={viewModel.warnings} />}
  </div>
)
```

---

#### 3. 状态合法性假设 ❌

**禁止行为**：
- ❌ 假设 `order.status === 'completed'` 时 `order.completed_at` 一定存在
- ❌ 假设 `fact_health.score > 80` 时数据一定正确
- ❌ 假设 `fact_warnings_structured.length === 0` 时没有数据问题
- ❌ 假设 `order.accepted_at !== null` 时订单一定已被接单

**正确做法**：
- ✅ UI 应始终处理 null/undefined 情况
- ✅ UI 不应假设 Facts 数据的合法性
- ✅ UI 应展示实际存在的数据，不推断缺失数据

**示例（错误）**：
```typescript
// ❌ 错误：UI 假设状态合法性
if (order.status === 'completed') {
  const completedDate = order.completed_at.toLocaleDateString() // 可能为 null
}
```

**示例（正确）**：
```typescript
// ✅ 正确：UI 处理 null 情况
const completedDate = order.completed_at 
  ? new Date(order.completed_at).toLocaleDateString()
  : '未完成'
```

---

## 三类消费方使用说明

本文档基于 `GET /api/facts/orders/:order_id` 的返回结果，说明三类消费方（Human、Machine、AI）如何使用事实数据。

## API 返回结构

```json
{
  "success": true,
  "order": {
    "order_id": "string",
    "restaurant_id": "string",
    "status": "string",
    "created_at": "string",
    "accepted_at": "string | null",
    "completed_at": "string | null",
    "worker_id": "string | null"
  },
  "assets": [
    {
      "asset_id": "string",
      "status": "string",
      "last_action": "string",
      "last_action_at": "string | null"
    }
  ],
  "traces": [
    {
      "id": "string",
      "asset_id": "string",
      "action_type": "string",
      "operator_id": "string",
      "order_id": "string | null",
      "created_at": "string"
    }
  ],
  "fact_warnings_structured": [
    {
      "code": "string",
      "level": "high" | "medium" | "low",
      "domain": "order" | "trace" | "audit",
      "message": "string",
      "fields": ["string"],
      "evidence": {}
    }
  ],
  "fact_health": {
    "score": 0-100,
    "summary": {
      "high": 0,
      "medium": 0,
      "low": 0
    }
  }
}
```

---

## 1. Human（管理端）使用说明

### 读取字段

**核心事实字段**：
- `order.order_id`：订单唯一标识
- `order.restaurant_id`：餐厅ID（用于权限验证）
- `order.status`：订单当前状态（pending, accepted, delivering, completed 等）
- `order.created_at`：订单创建时间
- `order.accepted_at`：订单被接单时间（可能为 null，表示尚未接单）
- `order.completed_at`：订单完成时间（可能为 null，表示尚未完成）
- `order.worker_id`：配送员ID（可能为 null，表示尚未分配）

**关联资产信息**：
- `assets[]`：订单关联的所有资产列表
  - `asset_id`：资产唯一标识
  - `status`：资产当前状态
  - `last_action`：最后一次操作类型
  - `last_action_at`：最后一次操作时间

**溯源轨迹信息**：
- `traces[]`：订单相关的所有溯源记录（按时间正序排列）
  - `action_type`：操作类型（ASSET_CREATED, ASSET_FILLED, ASSET_DELIVERED 等）
  - `operator_id`：操作人ID
  - `created_at`：操作时间

**数据质量警告**：
- `fact_warnings_structured[]`：结构化警告列表
  - `code`：警告代码（如 FACT_TIME_INVERSION）
  - `level`：严重程度（high, medium, low）
  - `message`：人类可读的描述信息
  - `fields`：相关字段列表
  - `evidence`：原始值快照

**健康度指标**：
- `fact_health.score`：整体健康度分数（0-100）
- `fact_health.summary`：按严重程度统计的警告数量

### 看到的信息

**订单详情视图**：
- 订单基本信息：订单ID、餐厅、状态、创建时间
- 时间线信息：创建时间 → 接单时间（如有）→ 完成时间（如有）
- 配送信息：配送员ID（如有）
- 关联资产：该订单涉及的所有资产及其状态
- 操作轨迹：按时间顺序展示所有相关操作记录

**数据质量视图**：
- 健康度分数：整体数据质量评分（0-100）
- 警告列表：按严重程度分组显示
  - 高严重程度（high）：需要立即关注的数据异常
  - 中等严重程度（medium）：需要关注但非紧急的异常
  - 低严重程度（low）：轻微的数据不一致
- 警告详情：每个警告的具体描述、相关字段、原始证据

**异常分析视图**：
- 时间异常：如 `accepted_at` 早于 `created_at`（时间倒置）
- 状态不一致：如订单状态为 completed 但 `completed_at` 为 null
- 轨迹缺失：如订单已完成但缺少相关 trace_logs 记录

### 触发的人工决策

**基于健康度分数的决策**：
- `fact_health.score < 50`：触发"数据质量审计"流程
  - 决策：是否需要人工介入修复数据
  - 决策：是否需要暂停相关业务流程
  - 决策：是否需要通知技术团队

**基于警告级别的决策**：
- `fact_warnings_structured` 中存在 `level: "high"` 的警告：
  - 决策：是否立即修复数据异常
  - 决策：是否暂停该订单的后续操作
  - 决策：是否需要追溯数据异常的根本原因

**基于时间异常的决策**：
- 检测到 `FACT_TIME_INVERSION` 警告：
  - 决策：是否修正 audit_logs 中的时间记录
  - 决策：是否需要重新计算订单时间线
  - 决策：是否需要调查时间异常的原因（系统时钟问题、数据迁移问题等）

**基于状态不一致的决策**：
- 检测到订单状态与时间字段不一致：
  - 决策：是否需要手动修正订单状态
  - 决策：是否需要补充缺失的 audit_logs 记录
  - 决策：是否需要回滚到正确的状态

**基于轨迹缺失的决策**：
- 检测到订单缺少必要的 trace_logs 记录：
  - 决策：是否需要补充溯源记录
  - 决策：是否需要追溯资产流转历史
  - 决策：是否需要调查数据丢失的原因

**基于资产状态的决策**：
- 查看 `assets[]` 中资产的状态和最后操作：
  - 决策：资产是否处于正常状态
  - 决策：是否需要检查资产的物理状态
  - 决策：是否需要更新资产状态

---

## 2. Machine（策略系统）使用说明

### 使用字段作为条件

**健康度分数条件**：
- `fact_health.score < 30`：触发"高风险数据告警"策略
- `fact_health.score < 50`：触发"中等风险数据监控"策略
- `fact_health.score < 70`：触发"低风险数据提醒"策略
- `fact_health.score >= 90`：标记为"高质量数据"，可用于可信度评估

**警告级别条件**：
- `fact_health.summary.high > 0`：触发"高严重程度异常处理"策略
- `fact_health.summary.medium >= 3`：触发"中等异常累积告警"策略
- `fact_health.summary.low >= 5`：触发"低异常模式识别"策略

**警告代码条件**：
- `fact_warnings_structured` 中存在 `code: "FACT_TIME_INVERSION"`：
  - 触发"时间异常修复"策略
  - 触发"时间线重新计算"策略
- `fact_warnings_structured` 中存在 `code: "FACT_MISSING_REQUIRED_FIELD"`：
  - 触发"必填字段缺失告警"策略
  - 触发"数据完整性检查"策略

**订单状态条件**：
- `order.status === "completed" && order.completed_at === null`：
  - 触发"状态不一致修复"策略
  - 触发"状态同步检查"策略
- `order.status === "accepted" && order.accepted_at === null`：
  - 触发"接单时间缺失修复"策略

**时间字段条件**：
- `order.accepted_at !== null && order.accepted_at < order.created_at`：
  - 触发"时间倒置检测"策略
- `order.completed_at !== null && order.completed_at < order.accepted_at`：
  - 触发"完成时间异常检测"策略

**资产状态条件**：
- `assets[]` 中存在 `status === "异常"` 的资产：
  - 触发"资产异常处理"策略
- `assets[]` 中存在 `last_action_at === null` 的资产：
  - 触发"资产轨迹缺失告警"策略

### 示例策略规则

**策略 1：高风险数据自动告警**
```
IF fact_health.score < 30 THEN
  触发告警通知（发送给管理员）
  记录到异常日志
  可选：暂停相关业务流程
END IF
```

**策略 2：时间异常自动修复**
```
IF fact_warnings_structured 中存在 code="FACT_TIME_INVERSION" THEN
  提取 evidence 中的原始时间值
  调用数据修复服务（在 Facts API 之外执行）
  记录修复操作到 audit_logs
END IF
```

**策略 3：状态不一致自动同步**
```
IF order.status === "completed" AND order.completed_at === null THEN
  查询 audit_logs 中是否存在 ORDER_COMPLETED 记录
  如果存在，更新订单的 completed_at 字段（在 Facts API 之外执行）
  如果不存在，触发人工审核流程
END IF
```

**策略 4：资产轨迹缺失自动补充**
```
IF assets[] 中存在 last_action_at === null THEN
  查询 trace_logs 中是否存在该资产的记录
  如果存在但未关联，触发数据关联修复（在 Facts API 之外执行）
  如果不存在，触发人工审核流程
END IF
```

### 说明：这是"输入信号"，不是执行逻辑

**重要原则**：
- Facts API 仅提供事实数据，不执行任何业务逻辑
- 策略系统基于 Facts API 的输出做出决策，但决策执行必须在 Facts API 之外
- Facts API 不修改数据、不触发动作、不承担决策责任

**输入信号示例**：
- `fact_health.score` 是输入信号，表示数据质量水平
- `fact_warnings_structured` 是输入信号，表示数据异常情况
- `order.status` 和 `order.completed_at` 的对比是输入信号，表示状态一致性

**执行逻辑位置**：
- 策略系统在接收到 Facts API 的输出后，在自己的业务逻辑层执行决策
- 数据修复、状态同步、告警发送等操作都在策略系统中实现
- Facts API 不参与任何执行逻辑

---

## 3. AI（解释系统）使用说明

### 使用 structured warnings + evidence

**结构化警告信息**：
- `fact_warnings_structured[].code`：警告代码，用于识别异常类型
- `fact_warnings_structured[].level`：严重程度，用于优先级排序
- `fact_warnings_structured[].domain`：影响域，用于分类解释
- `fact_warnings_structured[].message`：人类可读的描述，可作为解释的基础文本
- `fact_warnings_structured[].fields`：相关字段列表，用于定位问题范围
- `fact_warnings_structured[].evidence`：原始值快照，用于提供具体证据

**健康度汇总信息**：
- `fact_health.score`：整体健康度，用于生成总体评价
- `fact_health.summary`：按级别统计，用于生成分类说明

### 用于解释"为什么异常"

**时间异常解释**：
- 输入：`fact_warnings_structured` 中存在 `code: "FACT_TIME_INVERSION"`
- 使用 `evidence` 中的原始时间值：
  - `evidence.order_created_at`：订单创建时间
  - `evidence.accepted_at_from_audit`：从 audit_logs 提取的接单时间
- 生成解释：
  - "订单的接单时间（{accepted_at}）早于订单创建时间（{created_at}），这违反了时间顺序逻辑。可能的原因包括：系统时钟不同步、数据迁移错误、或 audit_logs 记录错误。"
  - "建议检查 audit_logs 表中 action='ORDER_ACCEPTED' 的记录，确认 created_at 字段是否正确。"

**状态不一致解释**：
- 输入：`fact_warnings_structured` 中存在 `code: "FACT_MISSING_REQUIRED_FIELD"`
- 使用 `fields` 和 `evidence`：
  - `fields: ["order.completed_at"]`：缺失的字段
  - `evidence.order_status: "completed"`：订单状态
  - `evidence.audit_logs_actions: ["ORDER_ACCEPTED"]`：audit_logs 中的动作列表
- 生成解释：
  - "订单状态为 'completed'，但缺少 completed_at 时间字段。检查 audit_logs 记录发现，存在 ORDER_ACCEPTED 动作，但未找到 ORDER_COMPLETED 或 ORDER_COMPLETE 动作。"
  - "可能的原因：订单状态被手动修改为 completed，但未记录相应的 audit_logs；或 audit_logs 记录丢失。"
  - "建议：检查订单状态变更历史，补充缺失的 audit_logs 记录。"

**轨迹缺失解释**：
- 输入：`fact_warnings_structured` 中存在 `code: "FACT_MISSING_TRACE"`
- 使用 `evidence` 中的资产和订单信息：
  - `evidence.asset_id`：资产ID
  - `evidence.order_id`：订单ID
  - `evidence.traces_count: 0`：trace_logs 记录数量
- 生成解释：
  - "订单 {order_id} 关联了资产 {asset_id}，但在 trace_logs 表中未找到任何相关记录。这意味着无法追溯该资产在此订单中的流转历史。"
  - "可能的原因：trace_logs 记录未正确创建、数据迁移过程中丢失、或资产关联关系错误。"
  - "建议：检查资产与订单的关联关系，确认是否需要补充 trace_logs 记录。"

**健康度评分解释**：
- 输入：`fact_health.score: 45`
- 使用 `fact_health.summary`：
  - `summary.high: 2`：2 个高严重程度警告
  - `summary.medium: 1`：1 个中等严重程度警告
  - `summary.low: 0`：0 个低严重程度警告
- 生成解释：
  - "订单数据健康度评分为 45 分（满分 100 分），属于中等偏低水平。"
  - "发现 2 个高严重程度异常、1 个中等严重程度异常，主要影响订单时间线和状态一致性。"
  - "建议优先处理高严重程度异常，修复后健康度预计可提升至 75 分以上。"

**多异常综合分析**：
- 输入：多个 `fact_warnings_structured` 警告
- 使用所有警告的 `code`、`level`、`domain`、`evidence`：
- 生成综合解释：
  - "订单存在多个数据异常："
  - "1. 时间异常：接单时间早于创建时间（高严重程度）"
  - "2. 状态不一致：订单状态为 completed 但缺少 completed_at（高严重程度）"
  - "3. 轨迹缺失：关联资产缺少 trace_logs 记录（中等严重程度）"
  - "综合分析：这些异常可能源于同一数据迁移事件，建议统一处理。"

### 解释输出格式

**自然语言解释**：
- 使用 `message` 字段作为基础，结合 `evidence` 生成详细解释
- 说明异常的具体表现、可能原因、影响范围、建议处理方式

**结构化解释**：
- 异常类型：基于 `code` 分类
- 严重程度：基于 `level` 评估
- 影响范围：基于 `fields` 确定
- 证据支持：基于 `evidence` 提供

**可视化解释**：
- 时间线可视化：展示订单时间线，标注异常时间点
- 状态流转图：展示订单状态变化，标注不一致状态
- 健康度仪表盘：展示整体健康度分数和警告分布

---

## 总结

### 三类消费方的核心区别

**Human（管理端）**：
- 关注：可读性、可视化、决策支持
- 使用：所有字段，重点关注 `fact_warnings_structured` 和 `fact_health`
- 输出：人工决策和操作

**Machine（策略系统）**：
- 关注：条件判断、自动化规则、阈值触发
- 使用：`fact_health.score`、`fact_warnings_structured[].code`、`fact_warnings_structured[].level`
- 输出：策略执行信号（在 Facts API 之外执行）

**AI（解释系统）**：
- 关注：异常原因分析、证据关联、自然语言生成
- 使用：`fact_warnings_structured[].message`、`fact_warnings_structured[].evidence`、`fact_health.summary`
- 输出：异常解释和修复建议

### 共同原则

1. **只读原则**：所有消费方都只能读取 Facts API 的输出，不能修改 Facts API 的行为
2. **不执行原则**：所有业务逻辑、数据修改、状态变更都在 Facts API 之外执行
3. **事实基础原则**：所有决策、策略、解释都基于 Facts API 提供的事实数据
